import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { contactPageSchema, contactSchema, loginResponseSchema } from '@gabinete-plus/shared';
import { hashPassword } from '../users/password.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('contatos, busca indexada, filtros, RBAC e seed com PostgreSQL real', async () => {
  const testUrl = process.env.TEST_DATABASE_URL; if (!testUrl) throw new Error('TEST_DATABASE_URL é obrigatória.');
  const databaseName = `contacts30_${randomUUID().replaceAll('-', '')}`; const url = new URL(testUrl); url.pathname = `/${databaseName}`;
  const admin = new Client({ connectionString: testUrl }); const client = new Client({ connectionString: url.toString() }); let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`); created = true; await client.connect();
    for (const name of ['20260731235902_init', '20261011000100_user_positions', '20261011000200_auth_sessions', '20261011000300_routines', '20261011000400_checklists', '20261011000500_contacts']) {
      await client.query(await readFile(new URL(`../../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
    }
    process.env.DATABASE_URL = url.toString(); const { createApp } = await import('../../app.js');
    const { seedDemoUsers } = await import('../users/users.repository.js'); const { seedDemoContacts } = await import('./contacts.repository.js');
    const { prisma } = await import('../../lib/prisma.js');
    try {
      const password = 'Senha-ficticia-contatos-30'; await seedDemoUsers(await hashPassword(password)); await seedDemoContacts(); await seedDemoContacts();
      const app = createApp(); const login = async (email: string) => {
        const response = await request(app).post('/auth/login').send({ email, password }); expect(response.status).toBe(200); return loginResponseSchema.parse(response.body);
      };
      const chief = await login('chefia@example.invalid'); const member = await login('assessor1@example.invalid'); const apoio = await login('apoio@example.invalid');
      const chiefHeader = `Bearer ${chief.accessToken}`; const memberHeader = `Bearer ${member.accessToken}`;
      expect((await request(app).get('/contacts')).status).toBe(401);
      for (const token of [member.accessToken, apoio.accessToken]) {
        const response = await request(app).get('/contacts').set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200); expect(contactPageSchema.parse(response.body).items).toHaveLength(2);
      }
      const input = { name: 'Contato Fictício', organization: 'Órgão Externo', jobTitle: 'Atendimento', phones: ['+55 (41) 00000-0000'],
        email: ' CONTATO@example.invalid ', notes: 'Observação fictícia', tags: [' Externo ', 'externo', 'transição'], isKeyContact: true };
      expect((await request(app).post('/contacts').set('Authorization', memberHeader).send(input)).status).toBe(403);
      const response = await request(app).post('/contacts').set('Authorization', chiefHeader).send(input); expect(response.status).toBe(201);
      const contact = contactSchema.parse(response.body); expect(contact.tags).toEqual(['externo', 'transição']); expect(contact.email).toBe('contato@example.invalid');
      expect(contact.createdById).toBe(chief.user.id); expect(response.text).not.toContain('searchText');
      expect((await request(app).post('/contacts').set('Authorization', chiefHeader).send({ ...input, email: 'inválido' })).status).toBe(400);
      expect((await request(app).post('/contacts').set('Authorization', chiefHeader).send({ ...input, phones: ['abc'] })).status).toBe(400);
      const filtered = await request(app).get('/contacts').query({ tag: 'EXTERNO', organization: 'órgão externo', isKeyContact: 'true' }).set('Authorization', memberHeader);
      expect(contactPageSchema.parse(filtered.body).items.map((row) => row.id)).toEqual([contact.id]);
      const search = await request(app).get('/contacts').query({ q: 'transi' }).set('Authorization', memberHeader);
      expect(contactPageSchema.parse(search.body).items.map((row) => row.id)).toContain(contact.id);
      const page = contactPageSchema.parse((await request(app).get('/contacts').query({ limit: 1 }).set('Authorization', memberHeader)).body);
      const next = contactPageSchema.parse((await request(app).get('/contacts').query({ limit: 1, cursor: page.nextCursor }).set('Authorization', memberHeader)).body);
      expect(page.items).toHaveLength(1); expect(next.items[0]?.id).not.toBe(page.items[0]?.id);
      expect((await request(app).get('/contacts').query({ limit: 101 }).set('Authorization', memberHeader)).status).toBe(400);
      expect((await request(app).patch(`/contacts/${contact.id}`).set('Authorization', memberHeader).send({ name: 'Indevido' })).status).toBe(403);
      await request(app).patch(`/contacts/${contact.id}`).set('Authorization', chiefHeader).send({ name: 'Nome Atualizado', tags: ['novo'], email: null, isKeyContact: false }).expect(200);
      const edited = contactSchema.parse((await request(app).get(`/contacts/${contact.id}`).set('Authorization', memberHeader)).body);
      expect(edited.name).toBe('Nome Atualizado'); expect(edited.email).toBeNull(); expect(edited.notes).toBe(input.notes); expect(edited.isKeyContact).toBe(false);
      const staleSearch = contactPageSchema.parse((await request(app).get('/contacts').query({ q: 'transi' }).set('Authorization', memberHeader)).body);
      expect(staleSearch.items.map((row) => row.id)).not.toContain(contact.id);
      const newSearch = contactPageSchema.parse((await request(app).get('/contacts').query({ q: 'Nome Atualizado' }).set('Authorization', memberHeader)).body);
      expect(newSearch.items.map((row) => row.id)).toContain(contact.id);
      await request(app).patch('/contacts/demo-contact-secretaria').set('Authorization', chiefHeader).send({ notes: 'Editado pela chefia' }).expect(200);
      await seedDemoContacts(); expect(contactSchema.parse((await request(app).get('/contacts/demo-contact-secretaria').set('Authorization', memberHeader)).body).notes).toBe('Editado pela chefia');
      for (let repeat = 0; repeat < 2; repeat++) await request(app).delete(`/contacts/${contact.id}`).set('Authorization', chiefHeader).expect(204);
      expect((await request(app).patch(`/contacts/${contact.id}`).set('Authorization', chiefHeader).send({ name: 'Não pode' })).status).toBe(409);
      expect(contactSchema.parse((await request(app).get(`/contacts/${contact.id}`).set('Authorization', memberHeader)).body).isArchived).toBe(true);
      expect(contactPageSchema.parse((await request(app).get('/contacts').set('Authorization', memberHeader)).body).items.map((row) => row.id)).not.toContain(contact.id);
      expect(contactPageSchema.parse((await request(app).get('/contacts').query({ isArchived: 'true' }).set('Authorization', memberHeader)).body).items.map((row) => row.id)).toContain(contact.id);
      expect(z.array(z.object({ id: z.string() })).parse((await client.query('SELECT id FROM contacts WHERE id = $1', [contact.id])).rows)).toHaveLength(1);
      expect((await request(app).get('/contacts/missing').set('Authorization', memberHeader)).status).toBe(404);
      const indexes = z.array(z.object({ indexname: z.string() })).parse((await client.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'contacts'`)).rows);
      expect(indexes.map((row) => row.indexname)).toContain('contacts_searchText_trgm_idx');
    } finally { await prisma.$disconnect(); }
  } finally { await client.end(); if (created) await admin.query(`DROP DATABASE "${databaseName}"`); await admin.end(); }
}, 20000);
