import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { z } from 'zod';
import { hashPassword } from '../modules/users/password.js';

export async function createIntegrationFixture() {
  if (process.env.NODE_ENV === 'production') throw new Error('Ambiente de produção não permitido.');
  const configured = z.url().refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://')).parse(process.env.TEST_DATABASE_URL);
  const name = `gabinete33_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(configured); url.pathname = `/${name}`;
  const admin = new Client({ connectionString: configured }); const client = new Client({ connectionString: url.toString() });
  let created = false; let connected = false; let closed = false;
  const previous = process.env.DATABASE_URL;
  await admin.connect();
  async function cleanup(): Promise<void> {
    if (closed) return; closed = true;
    try { if (connected) await client.end(); }
    finally {
      try { if (created) await admin.query(`DROP DATABASE "${name}"`); }
      finally {
        await admin.end();
        if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
      }
    }
  }
  try {
    // The name comes only from this function, never from TEST_DATABASE_URL.
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    await client.connect(); connected = true;
    const migrations = new URL('../../prisma/migrations/', import.meta.url);
    for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await client.query(await readFile(new URL(`${entry.name}/migration.sql`, migrations), 'utf8'));
    }
    process.env.DATABASE_URL = url.toString();
    const { createApp } = await import('../app.js');
    const { seedDemoUsers } = await import('../modules/users/users.repository.js');
    const { prisma } = await import('../lib/prisma.js');
    const password = 'Senha-ficticia-integracao-33'; const passwordHash = await hashPassword(password);
    return {
      client, password,
      async reset() {
        const current = z.array(z.object({ name: z.string() })).parse((await client.query('SELECT current_database() AS name')).rows);
        if (current[0]?.name !== name) throw new Error('O reset só pode atingir o banco isolado criado por este teste.');
        await client.query('TRUNCATE TABLE users CASCADE');
        await seedDemoUsers(passwordHash);
        // A new app also resets in-memory authentication rate limiters between cases.
        return createApp();
      },
      async close(): Promise<void> { try { await prisma.$disconnect(); } finally { await cleanup(); } },
    };
  } catch (error) { await cleanup(); throw error; }
}
