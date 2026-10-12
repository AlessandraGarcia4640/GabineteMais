import { expect, it } from 'vitest';
import { createRoutineSchema, createContactSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { TasksApi } from '../../../mobile/src/features/tasks/api.js';
import { initialTaskValues, taskChanges, taskPayload } from '../../../mobile/src/features/tasks/model.js';
import { RoutinesApi } from '../../../mobile/src/features/routines/api.js';
import { ContactsApi } from '../../../mobile/src/features/contacts/api.js';
import { ChecklistsApi } from '../../../mobile/src/features/checklists/api.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('tarefas mobile: seleção, vínculos, atribuição, execução e histórico contra API/PostgreSQL', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.'); const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    const session = () => new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    const chief = session(); const member = session(); const peer = session(); await chief.login({ email: 'chefia@example.invalid', password: fixture.password }); await member.login({ email: 'assessor1@example.invalid', password: fixture.password }); await peer.login({ email: 'apoio@example.invalid', password: fixture.password });
    const memberId = member.store.getState().user?.id; const peerId = peer.store.getState().user?.id; if (!memberId || !peerId) throw new Error('Usuário ausente.');
    const admin = new TasksApi(http, chief); const api = new TasksApi(http, member); const other = new TasksApi(http, peer);
    const routine = await new RoutinesApi(http, chief).create(createRoutineSchema.parse({ title: 'Rotina fictícia', category: 'Administrativo', frequency: 'DIARIA', instructions: 'Orientações originais', steps: ['Conferir item'] }));
    const contact = await new ContactsApi(http, chief).create(createContactSchema.parse({ name: 'Secretaria fictícia', organization: 'Tribunal fictício' })); const templates = new ChecklistsApi(http, chief); const checklists = new ChecklistsApi(http, member);
    const template = await templates.create({ routineId: routine.id, title: 'Checklist fictício' }); const run = await checklists.start(template.id, { date: '2026-10-12' });
    expect((await admin.choices('person', '', memberId, null)).items.some((item) => item.id === memberId)).toBe(true);
    expect((await admin.choices('routine', '', memberId, null)).items.map((item) => item.id)).toContain(routine.id); expect((await admin.choices('contact', '', memberId, null)).items.map((item) => item.id)).toContain(contact.id);
    expect((await admin.choices('run', '', memberId, routine.id)).items.map((item) => item.id)).toContain(run.id); expect((await admin.choices('run', '', peerId, routine.id)).items).toEqual([]);
    const values = initialTaskValues(memberId); Object.assign(values, { title: 'Tarefa fictícia vinculada', routineId: routine.id, contactId: contact.id, checklistRunId: run.id, dueDate: '01/01/2020', priority: 'ALTA' });
    await expect(other.create(taskPayload(values))).rejects.toMatchObject({ status: 403 }); const task = await admin.create(taskPayload(values)); expect(task.instructions).toBe(routine.instructions); expect(task.isOverdue).toBe(true);
    const edited = initialTaskValues(memberId, task); edited.description = 'Descrição\nAlterada'; const changes = taskChanges(task, edited); expect(changes).toEqual({ description: 'Descrição\nAlterada' }); if (!changes) throw new Error('Alteração ausente.');
    await expect(api.update(task.id, changes)).rejects.toMatchObject({ status: 403 }); const updated = await admin.update(task.id, changes); expect(updated.routineId).toBe(routine.id); expect(updated.instructions).toBe(task.instructions);
    await expect(admin.assign(task.id, peerId)).rejects.toMatchObject({ code: 'TASK_CHECKLIST_MISMATCH' }); await expect(other.status(task.id, 'EM_ANDAMENTO')).rejects.toMatchObject({ status: 403 });
    await expect(api.status(task.id, 'CONCLUIDA')).rejects.toMatchObject({ code: 'TASK_INVALID_TRANSITION' }); expect((await api.status(task.id, 'EM_ANDAMENTO')).status).toBe('EM_ANDAMENTO'); await expect(api.status(task.id, 'CONCLUIDA')).rejects.toMatchObject({ code: 'TASK_CHECKLIST_INCOMPLETE' });
    const item = run.items[0]; if (!item) throw new Error('Item ausente.'); await checklists.mark(run.id, item.id, true); const done = await api.status(task.id, 'CONCLUIDA'); expect(done.status).toBe('CONCLUIDA'); expect(done.isOverdue).toBe(false);
    await expect(checklists.mark(run.id, item.id, false)).rejects.toMatchObject({ code: 'CHECKLIST_TASK_COMPLETED' }); await expect(admin.update(task.id, { title: 'Indevido' })).rejects.toMatchObject({ code: 'TASK_CLOSED' });
    expect((await api.list({ assigneeId: memberId, status: 'CONCLUIDA', priority: 'ALTA' })).items.map((row) => row.id)).toContain(task.id); const history = await api.history(task.id); expect(history.items.map((event) => event.type)).toContain('EDITED'); expect(history.items.filter((event) => event.type === 'STATUS_CHANGED')).toHaveLength(2);
    const ownValues = initialTaskValues(memberId); ownValues.title = 'Tarefa própria'; const own = await api.create(taskPayload(ownValues)); expect(own.createdById).toBe(memberId); expect((await api.assign(own.id, peerId)).assigneeId).toBe(peerId);
    await expect(api.status(own.id, 'EM_ANDAMENTO')).rejects.toMatchObject({ status: 403 }); expect((await other.status(own.id, 'EM_ANDAMENTO')).status).toBe('EM_ANDAMENTO'); expect((await api.status(own.id, 'CANCELADA')).status).toBe('CANCELADA'); expect((await other.get(own.id)).status).toBe('CANCELADA');
    await member.logout(); await expect(api.get(task.id)).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally { try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); } }
});
