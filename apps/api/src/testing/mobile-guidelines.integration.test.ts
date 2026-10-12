import { expect, it } from 'vitest';
import request from 'supertest';
import { loginResponseSchema, guidelineSchema, guidelineVersionPageSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { GuidelinesApi } from '../../../mobile/src/features/guidelines/api.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('orientações: cliente mobile real, concorrência, versões imutáveis, seed e perfil atual', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.');
    const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    const session = () => new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    const chief = session(); const member = session(); await chief.login({ email: 'chefia@example.invalid', password: fixture.password }); await member.login({ email: 'assessor1@example.invalid', password: fixture.password });
    const admin = new GuidelinesApi(http, chief); const reader = new GuidelinesApi(http, member);
    const payload = { title: 'Sessão Fictícia', category: 'SESSOES', content: '# Preparação\n\nConteúdo original.', essentialForTransition: true };
    const input = guidelineSchema.shape.category.parse(payload.category);
    await expect(reader.create({ ...payload, category: input })).rejects.toMatchObject({ status: 403 });
    const created = await admin.create({ ...payload, category: input }); expect(created.version).toBe(1);
    expect((await reader.list({ q: 'original', category: 'SESSOES', essentialForTransition: 'true' })).items.map((row) => row.id)).toContain(created.id);
    const race = await Promise.allSettled([admin.update(created.id, { expectedVersion: 1, title: 'Alteração A' }), admin.update(created.id, { expectedVersion: 1, title: 'Alteração B' })]);
    expect(race.filter((result) => result.status === 'fulfilled')).toHaveLength(1); const failed = race.find((result) => result.status === 'rejected'); expect(failed?.status === 'rejected' ? failed.reason : null).toMatchObject({ status: 409, code: 'GUIDELINE_VERSION_CONFLICT' });
    expect((await reader.version(created.id, 1)).title).toBe(payload.title); const current = await reader.get(created.id); expect(current.version).toBe(2);
    const noop = await admin.update(created.id, { expectedVersion: 2, title: current.title }); expect(noop.version).toBe(2);
    const first = guidelineVersionPageSchema.parse((await request(app).get(`/guidelines/${created.id}/versions`).query({ limit: 1 }).set('Authorization', `Bearer ${await member.authorized((token) => Promise.resolve(token))}`).expect(200)).body);
    expect(first.items[0]?.version).toBe(2); expect(first.nextCursor).toBe('2'); expect((await reader.history(created.id, first.nextCursor ?? undefined)).items[0]?.version).toBe(1);
    await expect(fixture.client.query('UPDATE guideline_versions SET title = $1 WHERE guideline_id = $2', ['Indevido', created.id])).rejects.toThrow('immutable');
    await expect(fixture.client.query('DELETE FROM guideline_versions WHERE guideline_id = $1', [created.id])).rejects.toThrow('immutable');
    await admin.archive(created.id); await admin.archive(created.id); expect((await reader.get(created.id)).isArchived).toBe(true); expect((await reader.version(created.id, 1)).content).toBe(payload.content);
    await expect(admin.update(created.id, { expectedVersion: 2, title: 'Indevido' })).rejects.toMatchObject({ status: 409 });
    const { seedDemoGuidelines } = await import('../modules/guidelines/guidelines.repository.js'); await seedDemoGuidelines(); await seedDemoGuidelines();
    const seeded = (await reader.list({})).items.find((row) => row.id.startsWith('demo-guideline')); if (!seeded) throw new Error('Seed ausente.'); await admin.update(seeded.id, { expectedVersion: 1, title: 'Seed preservado' }); await seedDemoGuidelines(); expect((await reader.get(seeded.id)).title).toBe('Seed preservado');
    const otherChief = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'magistrado@example.invalid', password: fixture.password }).expect(200)).body);
    const chiefId = chief.store.getState().user?.id; if (!chiefId) throw new Error('Chefia ausente.'); await request(app).patch(`/users/${chiefId}/position`).set('Authorization', `Bearer ${otherChief.accessToken}`).send({ position: 'APOIO' }).expect(200);
    await expect(admin.create({ ...payload, category: input })).rejects.toMatchObject({ status: 403 }); expect(chief.store.getState().user?.role).toBe('APOIO');
    await member.logout(); await expect(reader.get(created.id)).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally { try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); } }
}, 30000);
