import { expect, it } from 'vitest';
import { createRoutineSchema, createContactSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { RoutinesApi } from '../../../mobile/src/features/routines/api.js';
import { ContactsApi } from '../../../mobile/src/features/contacts/api.js';
import { ChecklistsApi } from '../../../mobile/src/features/checklists/api.js';
import { TasksApi } from '../../../mobile/src/features/tasks/api.js';
import { initialTaskValues, taskPayload } from '../../../mobile/src/features/tasks/model.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('jornada integrada mobile/API: rede, contrato, CRUD, checklist e tarefa persistidos', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.'); let offline = false; let malformed = false;
    const transport: typeof fetch = async (url, options) => {
      if (offline) throw new TypeError('Rede indisponível no teste.'); const response = await fetch(url, options);
      const path = typeof url === 'string' ? new URL(url).pathname : url instanceof URL ? url.pathname : new URL(url.url).pathname;
      if (malformed && path === '/contacts') { await response.arrayBuffer(); return new Response(JSON.stringify({ items: [{ id: 'invalid' }], nextCursor: null })); } return response;
    };
    const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}/`, transport); const session = () => new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    const chief = session(); const member = session(); await chief.login({ email: 'chefia@example.invalid', password: fixture.password }); await member.login({ email: 'assessor1@example.invalid', password: fixture.password });
    const memberId = member.store.getState().user?.id; if (!memberId) throw new Error('Usuário ausente.');
    const routines = new RoutinesApi(http, chief); const contacts = new ContactsApi(http, chief); const templates = new ChecklistsApi(http, chief); const runs = new ChecklistsApi(http, member); const admin = new TasksApi(http, chief); const tasks = new TasksApi(http, member);
    const routine = await routines.create(createRoutineSchema.parse({ title: 'Jornada fictícia', category: 'Administrativo', frequency: 'DIARIA', instructions: 'Orientação da jornada', steps: ['Conferir registro'] })); const contact = await contacts.create(createContactSchema.parse({ name: 'Contato fictício', organization: 'Órgão fictício' }));
    const template = await templates.create({ routineId: routine.id, title: 'Checklist da jornada' }); const run = await runs.start(template.id, { date: '2026-10-12' });
    const values = initialTaskValues(memberId); Object.assign(values, { title: 'Executar jornada', routineId: routine.id, checklistRunId: run.id, contactId: contact.id }); const task = await admin.create(taskPayload(values)); expect(task.instructions).toBe(routine.instructions);
    offline = true; await expect(tasks.get(task.id)).rejects.toMatchObject({ code: 'network' }); await expect(contacts.create(createContactSchema.parse({ name: 'Não persistido', organization: 'Fictício' }))).rejects.toMatchObject({ code: 'network' }); expect(member.store.getState().status).toBe('authenticated'); offline = false;
    expect((await contacts.list({})).items).toHaveLength(1); malformed = true; await expect(contacts.list({})).rejects.toMatchObject({ code: 'unexpected' }); malformed = false; expect((await contacts.list({})).items[0]?.id).toBe(contact.id);
    await contacts.update(contact.id, { notes: 'Orientação alterada' }); await routines.update(routine.id, { title: 'Rotina alterada' }); expect((await runs.run(run.id)).routineTitleSnapshot).toBe('Jornada fictícia');
    await tasks.status(task.id, 'EM_ANDAMENTO'); await expect(tasks.status(task.id, 'CONCLUIDA')).rejects.toMatchObject({ code: 'TASK_CHECKLIST_INCOMPLETE' }); const item = run.items[0]; if (!item) throw new Error('Item ausente.'); await runs.mark(run.id, item.id, true); await tasks.status(task.id, 'CONCLUIDA');
    await templates.archive(template.id); await contacts.archive(contact.id); await routines.archive(routine.id); expect((await tasks.get(task.id)).status).toBe('CONCLUIDA'); expect((await tasks.get(task.id)).contactId).toBe(contact.id); expect((await runs.run(run.id)).items[0]?.isCompleted).toBe(true);
    await member.logout(); await expect(tasks.get(task.id)).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally { try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); } }
});
