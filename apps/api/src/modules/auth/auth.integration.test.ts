import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { apiErrorSchema, currentAccessSchema, loginResponseSchema, userPermissionsSchema } from '@gabinete-plus/shared';
import { hashPassword } from '../users/password.js';
import { hashRefreshToken } from './refresh-token.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('autenticação, sessões e RBAC com PostgreSQL real', async () => {
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
    await client.query(await readFile(new URL('../../../prisma/migrations/20261011000200_auth_sessions/migration.sql', import.meta.url), 'utf8'));
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
      const login = async () => {
        const response = await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password });
        expect(response.status).toBe(200);
        return loginResponseSchema.parse(response.body);
      };
      const stored = await client.query('SELECT "tokenHash" FROM refresh_tokens');
      const hashes = z.array(z.object({ tokenHash: z.string().regex(/^[0-9a-f]{64}$/) })).parse(stored.rows);
      expect(hashes).toEqual([{ tokenHash: hashRefreshToken(result.refreshToken) }]);
      expect(hashes[0]?.tokenHash).not.toBe(result.refreshToken);

      expect((await request(app).get('/auth/me')).status).toBe(401);
      const ownAccess = await request(app).get('/auth/me').set('Authorization', `Bearer ${result.accessToken}`);
      expect(ownAccess.status).toBe(200);
      expect(currentAccessSchema.parse(ownAccess.body).permissions).toContain('team:manage');
      const chiefPermissions = await request(app).get(`/users/${result.user.id}/permissions`).set('Authorization', `Bearer ${result.accessToken}`);
      expect(chiefPermissions.status).toBe(200);
      expect(userPermissionsSchema.parse(chiefPermissions.body).role).toBe('CHEFE');

      for (const email of ['assessor1@example.invalid', 'apoio@example.invalid']) {
        const memberLogin = await request(app).post('/auth/login').send({ email, password });
        expect(memberLogin.status).toBe(200);
        const member = loginResponseSchema.parse(memberLogin.body);
        const self = await request(app).get('/auth/me').set('Authorization', `Bearer ${member.accessToken}`);
        expect(self.status).toBe(200);
        expect(currentAccessSchema.parse(self.body).permissions).not.toContain('team:manage');
        expect((await request(app).get(`/users/${result.user.id}/permissions`).set('Authorization', `Bearer ${member.accessToken}`)).status).toBe(403);
      }

      await client.query('UPDATE users SET role = $1 WHERE id = $2', ['ASSESSOR', result.user.id]);
      const downgraded = await request(app).get('/auth/me').set('Authorization', `Bearer ${result.accessToken}`);
      expect(currentAccessSchema.parse(downgraded.body).user.role).toBe('ASSESSOR');
      expect((await request(app).get(`/users/${result.user.id}/permissions`).set('Authorization', `Bearer ${result.accessToken}`)).status).toBe(403);
      await client.query('UPDATE users SET role = $1 WHERE id = $2', ['CHEFE', result.user.id]);

      const { sessionRepository } = await import('./session.repository.js');
      await expect(sessionRepository.withToken(hashRefreshToken(result.refreshToken), async (record) => {
        if (!record) throw new Error('Token não persistido.');
        // Force a unique-key failure after consumption; the transaction must roll back both writes.
        await record.rotate(hashRefreshToken(result.refreshToken), new Date());
      })).rejects.toThrow();

      const rotation = await request(app).post('/auth/refresh').send({ refreshToken: result.refreshToken });
      expect(rotation.status).toBe(200);
      const rotated = loginResponseSchema.parse(rotation.body);
      expect(rotated.refreshToken).not.toBe(result.refreshToken);
      expect(rotated.refreshExpiresAt).toBe(result.refreshExpiresAt);
      expect((await request(app).post('/auth/refresh').send({ refreshToken: result.refreshToken })).status).toBe(401);
      expect((await request(app).post('/auth/refresh').send({ refreshToken: rotated.refreshToken })).status).toBe(401);
      expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${rotated.accessToken}`)).status).toBe(401);

      const concurrent = await login();
      const concurrentResponses = await Promise.all([
        request(app).post('/auth/refresh').send({ refreshToken: concurrent.refreshToken }),
        request(app).post('/auth/refresh').send({ refreshToken: concurrent.refreshToken }),
      ]);
      expect(concurrentResponses.map((response) => response.status).sort()).toEqual([200, 401]);
      const winner = concurrentResponses.find((response) => response.status === 200);
      if (!winner) throw new Error('Nenhuma rotação venceu.');
      const winnerToken = loginResponseSchema.parse(winner.body).refreshToken;
      expect((await request(app).post('/auth/refresh').send({ refreshToken: winnerToken })).status).toBe(401);

      const loggedOut = await login();
      const independent = await login();
      for (let repeat = 0; repeat < 2; repeat++) {
        expect((await request(app).post('/auth/logout').send({ refreshToken: loggedOut.refreshToken })).status).toBe(204);
      }
      expect((await request(app).post('/auth/refresh').send({ refreshToken: loggedOut.refreshToken })).status).toBe(401);
      expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${loggedOut.accessToken}`)).status).toBe(401);
      expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${independent.accessToken}`)).status).toBe(200);
      expect((await request(app).post('/auth/refresh').send({ refreshToken: independent.refreshToken })).status).toBe(200);

      const expired = await login();
      await client.query(`UPDATE auth_sessions SET "createdAt" = CURRENT_TIMESTAMP - INTERVAL '8 days',
        "expiresAt" = CURRENT_TIMESTAMP - INTERVAL '1 day'
        WHERE id = (SELECT "sessionId" FROM refresh_tokens WHERE "tokenHash" = $1)`, [hashRefreshToken(expired.refreshToken)]);
      expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${expired.accessToken}`)).status).toBe(401);
      expect((await request(app).post('/auth/refresh').send({ refreshToken: expired.refreshToken })).status).toBe(401);

      const logoutRace = await login();
      const [raceRefresh, raceLogout] = await Promise.all([
        request(app).post('/auth/refresh').send({ refreshToken: logoutRace.refreshToken }),
        request(app).post('/auth/logout').send({ refreshToken: logoutRace.refreshToken }),
      ]);
      expect(raceLogout.status).toBe(204);
      expect([200, 401]).toContain(raceRefresh.status);
      const raceToken = raceRefresh.status === 200 ? loginResponseSchema.parse(raceRefresh.body).refreshToken : logoutRace.refreshToken;
      expect((await request(app).post('/auth/refresh').send({ refreshToken: raceToken })).status).toBe(401);

      const wrong = await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password: 'senha-incorreta-24' });
      expect(wrong.status).toBe(401);
      const beforeDeactivation = await login();
      await client.query('UPDATE users SET "isActive" = false WHERE email = $1', ['chefia@example.invalid']);
      const inactive = await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password });
      expect(inactive.status).toBe(401);
      expect(apiErrorSchema.parse(inactive.body)).toEqual(apiErrorSchema.parse(wrong.body));
      expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${beforeDeactivation.accessToken}`)).status).toBe(401);
      expect((await request(app).post('/auth/refresh').send({ refreshToken: beforeDeactivation.refreshToken })).status).toBe(401);
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    await client.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin.end();
  }
});
