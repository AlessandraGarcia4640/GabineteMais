import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { apiErrorSchema, loginResponseSchema } from '@gabinete-plus/shared';
import { hashPassword } from '../users/password.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('login consulta PostgreSQL real e rejeita usuário desativado', async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL é obrigatória.');
  const databaseName = `auth24_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ connectionString: testUrl });
  const isolatedUrl = new URL(testUrl);
  isolatedUrl.pathname = `/${databaseName}`;
  const client = new Client({ connectionString: isolatedUrl.toString() });
  let created = false;
  await admin.connect();
  try {
    // Locally generated identifier; this test never resets the configured database.
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    await client.connect();
    await client.query(await readFile(new URL('../../../prisma/migrations/20260731235902_init/migration.sql', import.meta.url), 'utf8'));
    await client.query(await readFile(new URL('../../../prisma/migrations/20261011000100_user_positions/migration.sql', import.meta.url), 'utf8'));
    process.env.DATABASE_URL = isolatedUrl.toString();
    const { createApp } = await import('../../app.js');
    const { seedDemoUsers } = await import('../users/users.repository.js');
    const { prisma } = await import('../../lib/prisma.js');
    try {
      const password = 'Senha-ficticia-integracao-24';
      await seedDemoUsers(await hashPassword(password));
      const app = createApp();
      const success = await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password });
      expect(success.status).toBe(200);
      const result = loginResponseSchema.parse(success.body);
      expect(result.user.role).toBe('CHEFE');
      expect(success.text).not.toContain('passwordHash');
      const wrong = await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password: 'senha-incorreta-24' });
      expect(wrong.status).toBe(401);
      await client.query('UPDATE users SET "isActive" = false WHERE email = $1', ['chefia@example.invalid']);
      const inactive = await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password });
      expect(inactive.status).toBe(401);
      expect(apiErrorSchema.parse(inactive.body)).toEqual(apiErrorSchema.parse(wrong.body));
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    await client.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin.end();
  }
});
