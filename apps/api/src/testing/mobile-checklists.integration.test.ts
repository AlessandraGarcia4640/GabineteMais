import { expect, it } from 'vitest';
import { createRoutineSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { RoutinesApi } from '../../../mobile/src/features/routines/api.js';
import { ChecklistsApi } from '../../../mobile/src/features/checklists/api.js';
import { templatePayload, templateChanges, startPayload } from '../../../mobile/src/features/checklists/model.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('checklists mobile: formulários, período, propriedade, snapshot e arquivo contra API/PostgreSQL', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.');
    const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    const session = () => new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    const chief = session(); const member = session(); await chief.login({ email: 'chefia@example.invalid', password: fixture.password }); await member.login({ email: 'assessor1@example.invalid', password: fixture.password });
    const routines = new RoutinesApi(http, chief); const admin = new ChecklistsApi(http, chief); const api = new ChecklistsApi(http, member);
    const routine = await routines.create(createRoutineSchema.parse({ title: 'Rotina fictícia', category: 'Administrativo', frequency: 'DIARIA', instructions: 'Orientações originais', steps: ['Primeiro\nOrientação', 'Segundo'] }));
    const values = { routineId: routine.id, title: 'Checklist fictício', items: routine.steps.map((text) => ({ text })) }; const payload = templatePayload(values);
    await expect(api.create(payload)).rejects.toMatchObject({ status: 403 }); const template = await admin.create(payload);
    const input = startPayload('12/10/2026'); const run = await api.start(template.id, input); expect(run.assigneeId).toBe(member.store.getState().user?.id);
    expect((await api.start(template.id, input)).id).toBe(run.id); expect((await api.template(template.id)).items).toEqual(routine.steps);
    values.title = 'Modelo alterado'; values.items = [{ text: 'Novo item' }]; const changes = templateChanges(template, templatePayload(values)); if (!changes) throw new Error('Alteração ausente.');
    await admin.update(template.id, changes); await routines.update(routine.id, { instructions: 'Orientações novas' });
    const snapshot = await api.run(run.id); expect(snapshot.titleSnapshot).toBe(template.title); expect(snapshot.instructionsSnapshot).toBe('Orientações originais'); expect(snapshot.items.map((item) => item.text)).toEqual(routine.steps);
    const first = snapshot.items[0]; const second = snapshot.items[1]; if (!first || !second) throw new Error('Itens ausentes.');
    await admin.archive(template.id); expect((await api.list({ isArchived: 'true' })).items.some((row) => row.id === template.id)).toBe(true);
    await expect(api.start(template.id, startPayload('13/10/2026'))).rejects.toMatchObject({ status: 409, code: 'CHECKLIST_TEMPLATE_ARCHIVED' });
    expect((await api.mark(run.id, first.id, true)).status).toBe('EM_ANDAMENTO'); const done = await api.mark(run.id, second.id, true); expect(done.progress).toBe(100); expect(done.status).toBe('CONCLUIDA');
    expect((await api.mark(run.id, second.id, false)).status).toBe('EM_ANDAMENTO');
    expect((await api.runs({ templateId: template.id, assigneeId: run.assigneeId })).items.map((row) => row.id)).toEqual([run.id]);
    const other = session(); await other.login({ email: 'apoio@example.invalid', password: fixture.password });
    await expect(new ChecklistsApi(http, other).mark(run.id, first.id, false)).rejects.toMatchObject({ status: 403 });
    await member.logout(); await expect(api.run(run.id)).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally { try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); } }
});
