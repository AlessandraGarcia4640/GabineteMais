import { expect, it } from 'vitest';
import { z } from 'zod';
import request from 'supertest';
import { loginResponseSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import type { SessionStorage, StoredSession } from '../../../mobile/src/features/auth/storage.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('cliente mobile faz login, recupera sessão, atualiza perfil e sai contra API/PostgreSQL reais', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta HTTP não disponível.');
    const api = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    let saved: StoredSession | null = null;
    const storage: SessionStorage = { read: () => Promise.resolve(saved), save: (record) => { saved = record; return Promise.resolve(); }, clear: () => { saved = null; return Promise.resolve(); } };
    const manager = new SessionManager({ api, storage, clearCache: () => undefined });
    await manager.start();
    await expect(manager.login({ email: 'assessor1@example.invalid', password: 'senha-incorreta-34' })).rejects.toMatchObject({ code: 'invalidCredentials' });
    expect(manager.store.getState().status).toBe('anonymous');
    await manager.login({ email: 'assessor1@example.invalid', password: fixture.password });
    const first = await storage.read(); if (!first) throw new Error('Refresh não guardado.');
    const access = await manager.authorized((token) => api.current(token)); expect(access.user.role).toBe('ASSESSOR');
    const restored = new SessionManager({ api, storage, clearCache: () => undefined });
    await restored.start(); const renewed = await storage.read(); if (!renewed) throw new Error('Refresh não renovado.');
    expect(renewed.refreshToken).not.toBe(first.refreshToken); expect(renewed.refreshExpiresAt).toBe(first.refreshExpiresAt);
    expect(restored.store.getState().status).toBe('authenticated');
    const chief = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password: fixture.password }).expect(200)).body);
    await request(app).patch(`/users/${access.user.id}/position`).set('Authorization', `Bearer ${chief.accessToken}`).send({ position: 'APOIO' }).expect(200);
    await restored.validate(); expect(restored.store.getState().user?.role).toBe('APOIO');
    const hashes = z.array(z.object({ tokenHash: z.string().regex(/^[a-f0-9]{64}$/) })).parse((await fixture.client.query('SELECT "tokenHash" FROM refresh_tokens')).rows);
    expect(hashes.map((row) => row.tokenHash)).not.toContain(renewed.refreshToken);
    await restored.logout(); expect(await storage.read()).toBeNull(); expect(restored.store.getState().status).toBe('anonymous');
    await expect(api.refresh(renewed.refreshToken)).rejects.toMatchObject({ code: 'sessionExpired' });
    await expect(manager.authorized((token) => api.current(token))).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally {
    try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); }
    finally { await fixture.close(); }
  }
});
