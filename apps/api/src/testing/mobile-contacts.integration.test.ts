import { expect, it } from 'vitest';
import request from 'supertest';
import { loginResponseSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { ContactsApi } from '../../../mobile/src/features/contacts/api.js';
import { contactPayload, contactChanges, initialContactValues } from '../../../mobile/src/features/contacts/model.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('contatos mobile: formulário, filtros, PATCH mínimo, arquivamento e perfil atual contra API/PostgreSQL', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.');
    const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    const session = () => new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    const chief = session(); const member = session(); await chief.login({ email: 'chefia@example.invalid', password: fixture.password }); await member.login({ email: 'assessor1@example.invalid', password: fixture.password });
    const admin = new ContactsApi(http, chief); const reader = new ContactsApi(http, member); const values = initialContactValues();
    Object.assign(values, { name: 'Secretaria Fictícia', organization: 'Tribunal de Demonstração', jobTitle: 'Secretaria', email: ' SECRETARIA@example.invalid ', notes: 'Observação\nOrientação fictícia', isKeyContact: true,
      phones: [{ text: '(51) 3333-4444 ramal 12' }], tags: [{ text: ' Secretaria ' }, { text: 'SECRETARIA' }, { text: 'transição' }] });
    const payload = contactPayload(values); await expect(reader.create(payload)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' }); const created = await admin.create(payload);
    expect(created.email).toBe('secretaria@example.invalid'); expect(created.tags).toEqual(['secretaria', 'transição']); expect((await reader.get(created.id)).phones).toEqual(payload.phones);
    const listed = await reader.list({ q: 'Secretaria', organization: 'tribunal de demonstração', tag: 'SECRETARIA', isKeyContact: 'true', limit: 1 }); expect(listed.items.map((row) => row.id)).toEqual([created.id]);
    values.name = 'Secretaria Atualizada'; const changes = contactChanges(created, contactPayload(values)); expect(changes).toEqual({ name: 'Secretaria Atualizada' }); if (!changes) throw new Error('Alteração ausente.');
    const updated = await admin.update(created.id, changes); expect(updated.phones).toEqual(created.phones); expect(updated.notes).toBe(created.notes); expect(updated.tags).toEqual(created.tags);
    const clearing = initialContactValues(updated); clearing.email = ''; clearing.phones = []; clearing.tags = []; clearing.notes = ''; const clearChanges = contactChanges(updated, contactPayload(clearing)); if (!clearChanges) throw new Error('Alteração ausente.');
    const cleared = await admin.update(created.id, clearChanges); expect(cleared.email).toBeNull(); expect(cleared.phones).toEqual([]); expect(cleared.tags).toEqual([]); expect(cleared.notes).toBe('');
    await admin.archive(created.id); expect((await reader.get(created.id)).isArchived).toBe(true); expect((await reader.list({ isArchived: 'true' })).items.map((row) => row.id)).toContain(created.id); expect((await reader.list({})).items.map((row) => row.id)).not.toContain(created.id);
    await expect(admin.update(created.id, { name: 'Indevido' })).rejects.toMatchObject({ status: 409, code: 'CONTACT_ARCHIVED' }); await expect(reader.archive(created.id)).rejects.toMatchObject({ status: 403 });
    const otherChief = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'magistrado@example.invalid', password: fixture.password }).expect(200)).body);
    const chiefId = chief.store.getState().user?.id; if (!chiefId) throw new Error('Chefia ausente.'); await request(app).patch(`/users/${chiefId}/position`).set('Authorization', `Bearer ${otherChief.accessToken}`).send({ position: 'APOIO' }).expect(200);
    await expect(admin.create(payload)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' }); expect(chief.store.getState().user?.role).toBe('APOIO');
    await member.logout(); await expect(reader.get(created.id)).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally { try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); } }
});
