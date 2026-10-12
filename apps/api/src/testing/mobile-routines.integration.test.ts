import { expect, it } from 'vitest';
import request from 'supertest';
import { loginResponseSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { RoutinesApi } from '../../../mobile/src/features/routines/api.js';
import { initialValues, routineChanges, toRoutinePayload } from '../../../mobile/src/features/routines/form-model.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('rotinas mobile: cadastro, detalhes, PATCH mínimo, arquivamento e perfil atual contra API/PostgreSQL', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.');
    const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    const session = () => new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    const chief = session(); const member = session(); await chief.login({ email: 'chefia@example.invalid', password: fixture.password }); await member.login({ email: 'assessor1@example.invalid', password: fixture.password });
    const api = new RoutinesApi(http, chief); const reader = new RoutinesApi(http, member);
    const values = initialValues(); Object.assign(values, { title: 'Rotina fictícia personalizada', category: 'Administrativo', frequency: 'PERSONALIZADA', frequencyDetails: 'A cada dois dias úteis',
      instructions: 'Orientação fictícia', specificDate: '01/02/2027', defaultPosition: 'APOIO', essentialForTransition: true, steps: [{ text: 'Primeiro\ncom orientação' }, { text: 'Segundo' }] });
    const payload = toRoutinePayload(values); await expect(reader.create(payload)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    const created = await api.create(payload); expect(created.specificDate).toBe('2027-02-01'); expect(created.steps).toEqual(payload.steps); expect(created.defaultPosition).toBe('APOIO');
    const detail = await reader.get(created.id); expect(detail.instructions).toBe(payload.instructions);
    const edited = initialValues(detail); edited.title = 'Título alterado'; const changes = routineChanges(detail, toRoutinePayload(edited));
    expect(changes).toEqual({ title: 'Título alterado' }); if (!changes) throw new Error('Alteração ausente.');
    const updated = await api.update(created.id, changes); expect(updated.steps).toEqual(created.steps); expect(updated.specificDate).toBe(created.specificDate); expect(updated.essentialForTransition).toBe(true);
    const clearing = initialValues(updated); clearing.specificDate = ''; clearing.defaultPosition = '';
    const clearChanges = routineChanges(updated, toRoutinePayload(clearing)); if (!clearChanges) throw new Error('Campos opcionais não alterados.');
    const cleared = await api.update(created.id, clearChanges); expect(cleared.specificDate).toBeNull(); expect(cleared.defaultPosition).toBeNull(); expect(cleared.steps).toEqual(created.steps);
    const list = await reader.list({ q: 'Título alterado', frequency: 'PERSONALIZADA', limit: 1 }); expect(list.items.map((row) => row.id)).toEqual([created.id]);
    await api.archive(created.id); expect((await reader.get(created.id)).isArchived).toBe(true);
    expect((await reader.list({ isArchived: 'true' })).items.map((row) => row.id)).toContain(created.id);
    await expect(api.update(created.id, { title: 'Indevido' })).rejects.toMatchObject({ status: 409, code: 'ROUTINE_ARCHIVED' });
    const otherChief = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'magistrado@example.invalid', password: fixture.password }).expect(200)).body);
    const chiefId = chief.store.getState().user?.id; if (!chiefId) throw new Error('Chefia ausente.');
    await request(app).patch(`/users/${chiefId}/position`).set('Authorization', `Bearer ${otherChief.accessToken}`).send({ position: 'APOIO' }).expect(200);
    await expect(api.create(payload)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' }); expect(chief.store.getState().user?.role).toBe('APOIO');
    await member.logout(); await expect(reader.get(created.id)).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally { try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); } }
});
