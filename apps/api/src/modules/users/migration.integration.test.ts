import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { expect, it } from 'vitest';
import { z } from 'zod';

it.skipIf(!process.env.TEST_DATABASE_URL)('migra usuários existentes sem perder identidade ou senha', async () => {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  const schemaName = `issue23_${randomUUID().replaceAll('-', '')}`;
  let created = false;
  await client.connect();
  try {
    // The identifier is generated locally from a UUID, never from request input.
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    created = true;
    await client.query(`SET search_path TO "${schemaName}"`);
    await client.query(await readFile(new URL('../../../prisma/migrations/20260731235902_init/migration.sql', import.meta.url), 'utf8'));
    await client.query(`INSERT INTO users (id, name, email, "passwordHash", role, "updatedAt")
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
    ['existing-user', 'Pessoa Fictícia', 'existing@example.invalid', 'existing-hash', 'CHEFE']);
    await client.query(await readFile(new URL('../../../prisma/migrations/20261011000100_user_positions/migration.sql', import.meta.url), 'utf8'));
    await client.query(await readFile(new URL('../../../prisma/migrations/20261011000200_auth_sessions/migration.sql', import.meta.url), 'utf8'));
    const users = await client.query('SELECT id, "passwordHash" FROM users');
    const userRows = z.array(z.object({ id: z.string(), passwordHash: z.string() })).parse(users.rows);
    expect(userRows).toEqual([{ id: 'existing-user', passwordHash: 'existing-hash' }]);
    const history = await client.query('SELECT "userId", role, position, "endedAt" FROM user_position_history');
    const historyRows = z.array(z.object({ userId: z.string(), role: z.string(), position: z.string(), endedAt: z.null() })).parse(history.rows);
    expect(historyRows).toEqual([{ userId: 'existing-user', role: 'CHEFE', position: 'ASSESSOR_CHEFE', endedAt: null }]);
  } finally {
    if (created) await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await client.end();
  }
});
