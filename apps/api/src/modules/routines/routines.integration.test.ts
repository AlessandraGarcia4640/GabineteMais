import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { loginResponseSchema, routinePageSchema, routineSchema } from '@gabinete-plus/shared';
import { hashPassword } from '../users/password.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('atividades, filtros, RBAC, seed e arquivamento com PostgreSQL real', async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL é obrigatória.');
  const databaseName = `routines28_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(testUrl); url.pathname = `/${databaseName}`;
  const admin = new Client({ connectionString: testUrl });
  const client = new Client({ connectionString: url.toString() });
  let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
    await client.connect();
    for (const name of ['20260731235902_init', '20261011000100_user_positions', '20261011000200_auth_sessions', '20261011000300_routines']) {
      await client.query(await readFile(new URL(`../../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
    }
    process.env.DATABASE_URL = url.toString();
    const { createApp } = await import('../../app.js');
    const { seedDemoUsers } = await import('../users/users.repository.js');
    const { seedDemoRoutines } = await import('./routines.repository.js');
    const { prisma } = await import('../../lib/prisma.js');
    try {
      const password = 'Senha-ficticia-rotinas-28';
      await seedDemoUsers(await hashPassword(password)); await seedDemoRoutines(); await seedDemoRoutines();
      const app = createApp();
      const login = async (email: string) => {
        const response = await request(app).post('/auth/login').send({ email, password });
        expect(response.status).toBe(200); return loginResponseSchema.parse(response.body);
      };
      const chief = await login('chefia@example.invalid');
      const assessor = await login('assessor1@example.invalid');
      const apoio = await login('apoio@example.invalid');
      const chiefHeader = `Bearer ${chief.accessToken}`;
      const assessorHeader = `Bearer ${assessor.accessToken}`;
      expect((await request(app).get('/routines')).status).toBe(401);
      for (const token of [assessor.accessToken, apoio.accessToken]) {
        const listing = await request(app).get('/routines').set('Authorization', `Bearer ${token}`);
        expect(listing.status).toBe(200); expect(routinePageSchema.parse(listing.body).items).toHaveLength(3);
      }
      const input = { title: 'Atividade Fictícia', category: 'Administrativo', frequency: 'QUINZENAL',
        defaultPosition: 'APOIO', specificDate: '2026-11-10', steps: ['Primeiro passo', 'Segundo passo'], essentialForTransition: true };
      expect((await request(app).post('/routines').set('Authorization', assessorHeader).send(input)).status).toBe(403);
      const response = await request(app).post('/routines').set('Authorization', chiefHeader).send(input);
      expect(response.status).toBe(201); const routine = routineSchema.parse(response.body);
      expect(routine.createdById).toBe(chief.user.id); expect(routine.specificDate).toBe('2026-11-10');
      expect(routine.steps).toEqual(input.steps);
      const stored = await client.query('SELECT to_char("specificDate", $1) AS day FROM routines WHERE id = $2', ['YYYY-MM-DD', routine.id]);
      expect(z.array(z.object({ day: z.string() })).parse(stored.rows)[0]?.day).toBe('2026-11-10');
      const detail = await request(app).get(`/routines/${routine.id}`).set('Authorization', assessorHeader);
      expect(detail.status).toBe(200);
      const filtered = await request(app).get('/routines').query({ frequency: 'QUINZENAL', defaultPosition: 'APOIO', q: 'fictícia' }).set('Authorization', assessorHeader);
      expect(routinePageSchema.parse(filtered.body).items.map((row) => row.id)).toEqual([routine.id]);
      const page = routinePageSchema.parse((await request(app).get('/routines').query({ limit: 2 }).set('Authorization', assessorHeader)).body);
      const next = routinePageSchema.parse((await request(app).get('/routines').query({ limit: 2, cursor: page.nextCursor }).set('Authorization', assessorHeader)).body);
      expect(page.items).toHaveLength(2); expect(next.items).toHaveLength(2);
      expect(next.items.some((row) => page.items.some((first) => first.id === row.id))).toBe(false);
      expect((await request(app).get('/routines').query({ limit: 101 }).set('Authorization', assessorHeader)).status).toBe(400);
      expect((await request(app).patch(`/routines/${routine.id}`).set('Authorization', assessorHeader).send({ title: 'Indevido' })).status).toBe(403);
      expect((await request(app).patch(`/routines/${routine.id}`).set('Authorization', chiefHeader).send({ frequency: 'PERSONALIZADA' })).status).toBe(400);
      const changed = await request(app).patch(`/routines/${routine.id}`).set('Authorization', chiefHeader).send({ frequency: 'PERSONALIZADA', frequencyDetails: 'A cada três dias úteis' });
      expect(changed.status).toBe(200); expect(routineSchema.parse(changed.body).frequency).toBe('PERSONALIZADA');
      expect((await request(app).patch(`/routines/${routine.id}`).set('Authorization', chiefHeader).send({ frequencyDetails: null })).status).toBe(400);
      expect((await request(app).patch(`/routines/${routine.id}`).set('Authorization', chiefHeader).send({ createdById: 'outro' })).status).toBe(400);
      expect((await request(app).get('/routines/missing').set('Authorization', assessorHeader)).status).toBe(404);
      await request(app).patch('/routines/demo-routine-email').set('Authorization', chiefHeader).send({ title: 'Título editado pela chefia' }).expect(200);
      await seedDemoRoutines();
      const preserved = routineSchema.parse((await request(app).get('/routines/demo-routine-email').set('Authorization', assessorHeader)).body);
      expect(preserved.title).toBe('Título editado pela chefia');
      for (let attempt = 0; attempt < 2; attempt++) await request(app).delete(`/routines/${routine.id}`).set('Authorization', chiefHeader).expect(204);
      const archived = routineSchema.parse((await request(app).get(`/routines/${routine.id}`).set('Authorization', assessorHeader)).body);
      expect(archived.isArchived).toBe(true);
      expect((await request(app).patch(`/routines/${routine.id}`).set('Authorization', chiefHeader).send({ title: 'Não pode' })).status).toBe(409);
      const active = routinePageSchema.parse((await request(app).get('/routines').set('Authorization', assessorHeader)).body);
      expect(active.items.map((row) => row.id)).not.toContain(routine.id);
      const archivedPage = routinePageSchema.parse((await request(app).get('/routines').query({ isArchived: 'true' }).set('Authorization', assessorHeader)).body);
      expect(archivedPage.items.map((row) => row.id)).toContain(routine.id);
      expect(z.array(z.object({ id: z.string() })).parse((await client.query('SELECT id FROM routines WHERE id = $1', [routine.id])).rows)).toHaveLength(1);
    } finally { await prisma.$disconnect(); }
  } finally { await client.end(); if (created) await admin.query(`DROP DATABASE "${databaseName}"`); await admin.end(); }
}, 20000);
