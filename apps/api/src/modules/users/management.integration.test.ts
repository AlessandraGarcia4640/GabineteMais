import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { currentAccessSchema, loginResponseSchema, positionPageSchema, userDetailSchema, userPageSchema } from '@gabinete-plus/shared';
import { hashPassword, verifyPassword } from './password.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('CRUD, histórico, RBAC e última chefia com PostgreSQL real', async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL é obrigatória.');
  const databaseName = `users27_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(testUrl); url.pathname = `/${databaseName}`;
  const admin = new Client({ connectionString: testUrl });
  const client = new Client({ connectionString: url.toString() });
  let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
    await client.connect();
    for (const name of ['20260731235902_init', '20261011000100_user_positions', '20261011000200_auth_sessions']) {
      await client.query(await readFile(new URL(`../../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
    }
    process.env.DATABASE_URL = url.toString();
    const { createApp } = await import('../../app.js');
    const { seedDemoUsers } = await import('./users.repository.js');
    const { prisma } = await import('../../lib/prisma.js');
    try {
      const password = 'Senha-ficticia-gestao-27';
      await seedDemoUsers(await hashPassword(password));
      const app = createApp();
      const login = async (email: string, secret = password) => {
        const response = await request(app).post('/auth/login').send({ email, password: secret });
        expect(response.status).toBe(200); return loginResponseSchema.parse(response.body);
      };
      const chief = await login('chefia@example.invalid');
      const assessor = await login('assessor1@example.invalid');
      const chiefHeader = `Bearer ${chief.accessToken}`;
      const assessorHeader = `Bearer ${assessor.accessToken}`;

      expect((await request(app).get('/users')).status).toBe(401);
      const page1Response = await request(app).get('/users').query({ limit: 2 }).set('Authorization', assessorHeader);
      expect(page1Response.status).toBe(200);
      const firstPage = userPageSchema.parse(page1Response.body);
      expect(firstPage.items).toHaveLength(2); expect(firstPage.nextCursor).not.toBeNull();
      const secondPageResponse = await request(app).get('/users').query({ limit: 2, cursor: firstPage.nextCursor }).set('Authorization', assessorHeader);
      const secondPage = userPageSchema.parse(secondPageResponse.body);
      expect(secondPage.items.some((user) => firstPage.items.some((first) => first.id === user.id))).toBe(false);
      expect((await request(app).get('/users').query({ limit: 101 }).set('Authorization', assessorHeader)).status).toBe(400);

      const input = { name: 'Usuário Fictício', email: ' NOVO@example.invalid ', password, position: 'APOIO' };
      expect((await request(app).post('/users').set('Authorization', assessorHeader).send(input)).status).toBe(403);
      const newResponse = await request(app).post('/users').set('Authorization', chiefHeader).send(input);
      expect(newResponse.status).toBe(201);
      const member = userDetailSchema.parse(newResponse.body);
      expect(member.email).toBe('novo@example.invalid'); expect(member.role).toBe('APOIO');
      expect(newResponse.text).not.toContain('passwordHash'); expect(newResponse.text).not.toContain(password);
      const stored = await client.query('SELECT "passwordHash" FROM users WHERE id = $1', [member.id]);
      const storedHash = z.array(z.object({ passwordHash: z.string() })).parse(stored.rows)[0];
      if (!storedHash) throw new Error('Usuário não persistido.');
      expect(await verifyPassword(storedHash.passwordHash, password)).toBe(true);
      const duplicate = await request(app).post('/users').set('Authorization', chiefHeader).send({ ...input, email: 'NOVO@example.invalid' });
      expect(duplicate.status).toBe(409);
      const memberSession = await login('NOVO@example.invalid');
      const memberHeader = `Bearer ${memberSession.accessToken}`;
      expect((await request(app).patch('/users/me').set('Authorization', memberHeader).send({ name: 'Novo Nome', role: 'CHEFE' })).status).toBe(400);
      const own = await request(app).patch('/users/me').set('Authorization', memberHeader).send({ name: 'Nome Atualizado' });
      expect(own.status).toBe(200); expect(userDetailSchema.parse(own.body).name).toBe('Nome Atualizado');
      expect((await request(app).patch(`/users/${chief.user.id}`).set('Authorization', memberHeader).send({ name: 'Indevido' })).status).toBe(403);

      const before = await request(app).get(`/users/${member.id}/positions`).set('Authorization', assessorHeader);
      const initialHistory = positionPageSchema.parse(before.body);
      expect(initialHistory.items).toHaveLength(1);
      const promoted = await request(app).patch(`/users/${member.id}/position`).set('Authorization', chiefHeader).send({ position: 'ASSESSOR' });
      expect(promoted.status).toBe(200); expect(userDetailSchema.parse(promoted.body).id).toBe(member.id);
      const access = await request(app).get('/auth/me').set('Authorization', memberHeader);
      expect(currentAccessSchema.parse(access.body).user.role).toBe('ASSESSOR');
      await request(app).patch(`/users/${member.id}/position`).set('Authorization', chiefHeader).send({ position: 'ASSESSOR' }).expect(200);
      const historyResponse = await request(app).get(`/users/${member.id}/positions`).set('Authorization', chiefHeader);
      const history = positionPageSchema.parse(historyResponse.body);
      expect(history.items).toHaveLength(2);
      expect(history.items.filter((entry) => entry.endedAt === null)).toHaveLength(1);
      const old = history.items.find((entry) => entry.id === initialHistory.items[0]?.id);
      if (!old?.endedAt) throw new Error('Histórico antigo não encerrado.');
      expect(Date.parse(old.endedAt)).toBeGreaterThan(Date.parse(old.startedAt));

      for (let repeat = 0; repeat < 2; repeat++) await request(app).delete(`/users/${member.id}`).set('Authorization', chiefHeader).expect(204);
      expect((await request(app).get('/auth/me').set('Authorization', memberHeader)).status).toBe(401);
      expect((await request(app).post('/auth/refresh').send({ refreshToken: memberSession.refreshToken })).status).toBe(401);
      const inactiveList = await request(app).get('/users').query({ isActive: 'false' }).set('Authorization', chiefHeader);
      expect(userPageSchema.parse(inactiveList.body).items.map((user) => user.id)).toContain(member.id);
      expect(positionPageSchema.parse((await request(app).get(`/users/${member.id}/positions`).set('Authorization', chiefHeader)).body).items).toHaveLength(2);
      const retained = z.array(z.object({ id: z.string() })).parse((await client.query('SELECT id FROM users WHERE id = $1', [member.id])).rows);
      expect(retained).toHaveLength(1);

      const secondChief = await login('magistrado@example.invalid');
      const secondHeader = `Bearer ${secondChief.accessToken}`;
      const concurrent = await Promise.all([
        request(app).delete(`/users/${chief.user.id}`).set('Authorization', chiefHeader),
        request(app).delete(`/users/${secondChief.user.id}`).set('Authorization', secondHeader),
      ]);
      expect(concurrent.map((response) => response.status).sort()).toEqual([204, 409]);
      const remaining = await client.query(`SELECT id FROM users WHERE role = 'CHEFE' AND "isActive" = true`);
      const remainingChief = z.array(z.object({ id: z.string() })).parse(remaining.rows);
      expect(remainingChief).toHaveLength(1);
      const remainingHeader = remainingChief[0]?.id === chief.user.id ? chiefHeader : secondHeader;
      const remainingId = remainingChief[0]?.id;
      if (!remainingId) throw new Error('Nenhuma chefia ativa.');
      expect((await request(app).patch(`/users/${remainingId}/position`).set('Authorization', remainingHeader).send({ position: 'APOIO' })).status).toBe(409);
    } finally { await prisma.$disconnect(); }
  } finally {
    await client.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin.end();
  }
}, 20000);
