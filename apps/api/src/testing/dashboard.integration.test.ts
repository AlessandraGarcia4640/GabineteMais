import request from 'supertest';
import { expect, it } from 'vitest';
import { loginResponseSchema, routinePageSchema, routineSchema, taskSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { HttpAuthApi } from '../../../mobile/src/features/auth/api.js';
import { SessionManager } from '../../../mobile/src/features/auth/session-manager.js';
import { DashboardApi } from '../../../mobile/src/features/dashboard/api.js';
import { pendingPreview } from '../../../mobile/src/features/dashboard/model.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('dashboard usa API/PostgreSQL: calendário, pesquisa, paginação e pendências do usuário', async () => {
  const fixture = await createIntegrationFixture();
  const app = await fixture.reset(); const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const chief = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'chefia@example.invalid', password: fixture.password }).expect(200)).body);
    const member = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'assessor1@example.invalid', password: fixture.password }).expect(200)).body);
    const header = `Bearer ${chief.accessToken}`; const day = '2026-10-12';
    const created = [];
    for (const input of [
      { title: 'Diária fictícia', frequency: 'DIARIA', specificDate: null },
      { title: 'Evento fictício hoje', frequency: 'EVENTUAL', specificDate: day },
      { title: 'Diária com data hoje', frequency: 'DIARIA', specificDate: day },
      { title: 'Diária com data futura', frequency: 'DIARIA', specificDate: '2026-10-13' },
      { title: 'Semanal sem data', frequency: 'SEMANAL', specificDate: null },
      { title: 'Diária arquivada', frequency: 'DIARIA', specificDate: null },
    ]) created.push(routineSchema.parse((await request(app).post('/routines').set('Authorization', header).send({ ...input, category: 'Administrativo' }).expect(201)).body));
    const archived = created.at(-1); if (!archived) throw new Error('Fixture ausente.');
    await request(app).delete(`/routines/${archived.id}`).set('Authorization', header).expect(204);
    await request(app).get('/routines').query({ scheduledFor: '2026-02-30' }).set('Authorization', header).expect(400);
    const filtered = routinePageSchema.parse((await request(app).get('/routines').query({ scheduledFor: day, q: 'Evento' }).set('Authorization', header).expect(200)).body);
    expect(filtered.items.map((row) => row.title)).toEqual(['Evento fictício hoje']);
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta ausente.');
    const http = new HttpAuthApi(`http://127.0.0.1:${String(address.port)}`);
    const manager = new SessionManager({ api: http, storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => undefined });
    await manager.login({ email: member.user.email, password: fixture.password }); const api = new DashboardApi(http, manager);
    const titles: string[] = []; let cursor: string | null = null;
    do { const page = await api.routines({ scheduledFor: day, limit: 1, ...(cursor ? { cursor } : {}) }); titles.push(...page.items.map((row) => row.title)); cursor = page.nextCursor; } while (cursor);
    expect(titles.sort()).toEqual(['Diária fictícia', 'Evento fictício hoje', 'Diária com data hoje'].sort());
    const own = [];
    for (let n = 0; n < 6; n++) own.push(taskSchema.parse((await request(app).post('/tasks').set('Authorization', header).send({
      title: `Tarefa fictícia ${String(n)}`, assigneeId: member.user.id, dueDate: '2000-01-01', priority: n === 0 ? 'URGENTE' : 'NORMAL',
    }).expect(201)).body));
    const progress = taskSchema.parse((await request(app).post('/tasks').set('Authorization', header).send({ title: 'Tarefa em andamento', assigneeId: member.user.id, dueDate: '2001-01-01' }).expect(201)).body);
    await request(app).patch(`/tasks/${progress.id}/status`).set('Authorization', header).send({ status: 'EM_ANDAMENTO' }).expect(200);
    await request(app).post('/tasks').set('Authorization', header).send({ title: 'Tarefa da chefia' }).expect(201);
    const openPage = await api.tasks({ status: 'ABERTA', assigneeId: member.user.id, limit: 5 });
    const progressPage = await api.tasks({ status: 'EM_ANDAMENTO', assigneeId: member.user.id, limit: 5 });
    const preview = pendingPreview(openPage.items, progressPage.items, member.user.id);
    expect(preview).toHaveLength(5); expect(preview[0]?.priority).toBe('URGENTE'); expect(preview.every((row) => row.assigneeId === member.user.id)).toBe(true);
    expect(openPage.nextCursor).not.toBeNull();
    if (!openPage.nextCursor) throw new Error('Cursor ausente.');
    const next = await api.tasks({ status: 'ABERTA', assigneeId: member.user.id, limit: 5, cursor: openPage.nextCursor }); expect(next.items).toHaveLength(1);
    expect(next.items.every((row) => !openPage.items.some((first) => first.id === row.id))).toBe(true);
    await manager.logout(); await expect(api.routines({ scheduledFor: day })).rejects.toMatchObject({ code: 'sessionExpired' });
  } finally {
    try { await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve(); })); } finally { await fixture.close(); }
  }
});
