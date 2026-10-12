import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { decodeJwt, SignJWT } from 'jose';
import type { Express } from 'express';
import request from 'supertest';
import { parse } from 'yaml';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema, checklistRunSchema, checklistTemplateSchema, contactSchema, currentAccessSchema, loginResponseSchema,
  routineSchema, taskEventPageSchema, taskPageSchema, taskSchema, userDetailSchema, type LoginResponse } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { ACCESS_TOKEN_AUDIENCE, ACCESS_TOKEN_ISSUER } from '../modules/auth/access-token.js';

interface TestContext { app: Express; chief: LoginResponse; member: LoginResponse; peer: LoginResponse; password: string }
let fixture: Awaited<ReturnType<typeof createIntegrationFixture>> | null = null;
let context: TestContext | null = null;
function current(): TestContext { if (!context) throw new Error('Fixture não preparada.'); return context; }
const bearer = (session: LoginResponse): string => `Bearer ${session.accessToken}`;
async function linkedFlow() {
  const { app, chief, member } = current(); const header = bearer(chief);
  const routine = routineSchema.parse((await request(app).post('/routines').set('Authorization', header).send({
    title: 'Atividade fictícia integrada', category: 'Administrativo', frequency: 'DIARIA', instructions: 'Instrução original', steps: ['Conferir expediente', 'Registrar resultado'],
  }).expect(201)).body);
  const contact = contactSchema.parse((await request(app).post('/contacts').set('Authorization', header).send({
    name: 'Secretaria Fictícia', organization: 'Órgão Fictício', tags: ['teste'], isKeyContact: true,
  }).expect(201)).body);
  const template = checklistTemplateSchema.parse((await request(app).post('/checklists/templates').set('Authorization', header).send({ routineId: routine.id, title: 'Checklist fictício' }).expect(201)).body);
  const run = checklistRunSchema.parse((await request(app).post(`/checklists/templates/${template.id}/runs`).set('Authorization', header).send({ date: '2026-10-11', assigneeId: member.user.id }).expect(201)).body);
  const task = taskSchema.parse((await request(app).post('/tasks').set('Authorization', header).send({
    title: 'Tarefa fictícia integrada', assigneeId: member.user.id, routineId: routine.id, checklistRunId: run.id, contactId: contact.id, dueDate: '2000-01-01', priority: 'ALTA',
  }).expect(201)).body);
  return { routine, contact, template, run, task };
}
async function completeChecklist(run: z.infer<typeof checklistRunSchema>): Promise<void> {
  const { app, member } = current();
  for (const item of run.items) await request(app).patch(`/checklists/runs/${run.id}/items/${item.id}`).set('Authorization', bearer(member)).send({ isCompleted: true }).expect(200);
}

describe.skipIf(!process.env.TEST_DATABASE_URL)('fluxos core integrados com PostgreSQL', () => {
  beforeAll(async () => { fixture = await createIntegrationFixture(); });
  beforeEach(async () => {
    if (!fixture) throw new Error('Banco isolado ausente.'); const app = await fixture.reset(); const password = fixture.password;
    const login = async (email: string) => loginResponseSchema.parse((await request(app).post('/auth/login').send({ email, password }).expect(200)).body);
    context = { app, password, chief: await login('chefia@example.invalid'), member: await login('assessor1@example.invalid'), peer: await login('apoio@example.invalid') };
  });
  afterAll(async () => { if (fixture) await fixture.close(); context = null; });

  it('todos os endpoints protegidos rejeitam chamada anônima antes de alterar dados', async () => {
    const { app } = current();
    const operation = z.object({ security: z.array(z.record(z.string(), z.array(z.string()))) });
    const document = z.object({ paths: z.record(z.string(), z.partialRecord(z.enum(['get', 'post', 'patch', 'delete']), operation)) })
      .parse(parse(await readFile(new URL('../../../../openapi/gabinete-plus.yaml', import.meta.url), 'utf8')));
    let checked = 0;
    for (const [path, methods] of Object.entries(document.paths)) for (const method of ['get', 'post', 'patch', 'delete'] satisfies ('get' | 'post' | 'patch' | 'delete')[]) {
      const op = methods[method]; if (!op?.security.length) continue;
      const response = await request(app)[method](path.replace(/\{[^}]+\}/g, 'missing')).send({});
      expect(response.status, `${method} ${path}`).toBe(401); expect(apiErrorSchema.parse(response.body).error.code).toBe('UNAUTHENTICATED');
      expect(response.headers['www-authenticate']).toBe('Bearer'); expect(response.headers['cache-control']).toBe('no-store'); checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(37);
  });

  it('ASSESSOR e APOIO não gerenciam membros, cargos, atividades, modelos ou contatos', async () => {
    const { app, member, peer } = current();
    for (const session of [member, peer]) for (const path of ['/users', '/routines', '/checklists/templates', '/contacts']) {
      const response = await request(app).post(path).set('Authorization', bearer(session)).send({});
      expect(response.status, `${session.user.role} ${path}`).toBe(403); expect(apiErrorSchema.parse(response.body).error.code).toBe('FORBIDDEN');
    }
    for (const session of [member, peer]) await request(app).patch(`/users/${member.user.id}/position`).set('Authorization', bearer(session)).send({ position: 'ASSESSOR_CHEFE' }).expect(403);
  });

  it('JSON malformado e campos de autoria externos falham sem criar tarefas', async () => {
    const { app, chief, member } = current();
    const malformed = await request(app).post('/tasks').set('Authorization', bearer(chief)).set('Content-Type', 'application/json').send('{"title":');
    expect(malformed.status).toBe(400); expect(apiErrorSchema.parse(malformed.body).error.code).toBe('INVALID_JSON');
    for (const field of ['createdById', 'updatedById', 'completedById', 'status', 'priorityRank']) {
      const response = await request(app).post('/tasks').set('Authorization', bearer(member)).send({ title: 'Indevida', [field]: chief.user.id });
      expect(response.status).toBe(400); expect(apiErrorSchema.parse(response.body).error.code).toBe('VALIDATION_ERROR');
    }
    expect(taskPageSchema.parse((await request(app).get('/tasks').set('Authorization', bearer(chief)).expect(200)).body).items).toHaveLength(0);
  });

  it('atividade → checklist → contato → tarefa mantém snapshots e registra conclusão', async () => {
    const { app, chief, member } = current(); const { routine, contact, template, run, task } = await linkedFlow();
    expect(task.instructions).toBe('Instrução original'); expect(task.contactId).toBe(contact.id);
    await request(app).patch(`/routines/${routine.id}`).set('Authorization', bearer(chief)).send({ instructions: 'Instrução atualizada' }).expect(200);
    await request(app).patch(`/checklists/templates/${template.id}`).set('Authorization', bearer(chief)).send({ items: ['Novo item'] }).expect(200);
    const stored = checklistRunSchema.parse((await request(app).get(`/checklists/runs/${run.id}`).set('Authorization', bearer(member)).expect(200)).body);
    expect(stored.items.map((item) => item.text)).toEqual(['Conferir expediente', 'Registrar resultado']); expect(stored.instructionsSnapshot).toBe('Instrução original');
    await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'EM_ANDAMENTO' }).expect(200);
    const blocked = await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'CONCLUIDA' }).expect(409);
    expect(apiErrorSchema.parse(blocked.body).error.code).toBe('TASK_CHECKLIST_INCOMPLETE');
    await completeChecklist(run);
    const completed = taskSchema.parse((await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'CONCLUIDA' }).expect(200)).body);
    expect(completed.completedById).toBe(member.user.id); expect(completed.completedAt).not.toBeNull(); expect(completed.isOverdue).toBe(false); expect(completed.instructions).toBe('Instrução original');
    const history = taskEventPageSchema.parse((await request(app).get(`/tasks/${task.id}/history`).set('Authorization', bearer(chief)).expect(200)).body);
    expect(history.items.map((event) => event.toStatus)).toEqual(['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA']);
  });

  it('arquivamento preserva vínculos e permite concluir pendências existentes', async () => {
    const { app, chief, member } = current(); const { routine, contact, template, run, task } = await linkedFlow();
    for (const path of [`/routines/${routine.id}`, `/contacts/${contact.id}`, `/checklists/templates/${template.id}`]) await request(app).delete(path).set('Authorization', bearer(chief)).expect(204);
    await request(app).post('/tasks').set('Authorization', bearer(chief)).send({ title: 'Não permitida', routineId: routine.id }).expect(409);
    await request(app).post('/tasks').set('Authorization', bearer(chief)).send({ title: 'Não permitida', contactId: contact.id }).expect(409);
    await request(app).post(`/checklists/templates/${template.id}/runs`).set('Authorization', bearer(member)).send({ date: '2026-10-12' }).expect(409);
    await completeChecklist(run);
    await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'EM_ANDAMENTO' }).expect(200);
    await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'CONCLUIDA' }).expect(200);
    expect(routineSchema.parse((await request(app).get(`/routines/${routine.id}`).set('Authorization', bearer(member)).expect(200)).body).isArchived).toBe(true);
    expect(contactSchema.parse((await request(app).get(`/contacts/${contact.id}`).set('Authorization', bearer(member)).expect(200)).body).isArchived).toBe(true);
  });

  it('logout invalida acesso a todos os módulos e preserva outra sessão', async () => {
    const { app, member, password } = current();
    const independent = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: member.user.email, password }).expect(200)).body);
    await request(app).post('/auth/logout').send({ refreshToken: member.refreshToken }).expect(204);
    for (const path of ['/auth/me', '/users', '/routines', '/checklists/templates', '/checklists/runs', '/contacts', '/tasks']) {
      const response = await request(app).get(path).set('Authorization', bearer(member)).expect(401);
      expect(apiErrorSchema.parse(response.body).error.code).toBe('UNAUTHENTICATED');
      await request(app).get(path).set('Authorization', bearer(independent)).expect(200);
    }
    await request(app).post('/tasks').set('Authorization', bearer(member)).send({ title: 'Indevida' }).expect(401);
  });

  it('rejeita JWT expirado, assinatura incorreta e cabeçalhos malformados', async () => {
    const { app, member } = current(); const { sid } = z.object({ sid: z.uuid() }).parse(decodeJwt(member.accessToken));
    const now = Math.floor(Date.now() / 1000);
    const secret = z.string().min(32).parse(process.env.JWT_ACCESS_SECRET);
    const sign = (key: string, expired: boolean) => new SignJWT({ sid, role: member.user.role })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(member.user.id).setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE).setJti(randomUUID()).setIssuedAt(expired ? now - 3600 : now)
      .setExpirationTime(expired ? now - 1 : now + 900).sign(new TextEncoder().encode(key));
    const expired = await sign(secret, true); const forged = await sign('assinatura-ficticia-incorreta-etapa-33', false);
    for (const header of ['Bearer invalid', 'Basic invalid', `Bearer ${expired}`, `Bearer ${forged}`]) {
      const response = await request(app).get('/tasks').set('Authorization', header).expect(401);
      expect(apiErrorSchema.parse(response.body).error.code).toBe('UNAUTHENTICATED');
    }
    await request(app).get('/auth/me').set('Authorization', bearer(member)).expect(200);
  });

  it('mudança oficial de cargo retira privilégios de um JWT ainda válido', async () => {
    const { app, chief, password } = current();
    const otherChief = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'magistrado@example.invalid', password }).expect(200)).body);
    await request(app).patch(`/users/${chief.user.id}/position`).set('Authorization', bearer(otherChief)).send({ position: 'APOIO' }).expect(200);
    const access = currentAccessSchema.parse((await request(app).get('/auth/me').set('Authorization', bearer(chief)).expect(200)).body);
    expect(access.user.role).toBe('APOIO'); expect(access.permissions).not.toContain('team:manage');
    for (const path of ['/users', '/routines', '/checklists/templates', '/contacts']) await request(app).post(path).set('Authorization', bearer(chief)).send({}).expect(403);
    await request(app).post('/tasks').set('Authorization', bearer(chief)).send({ title: 'Tarefa própria após mudança' }).expect(201);
  });

  it('desativação revoga sessões sem perder tarefas e checklists do responsável', async () => {
    const { app, chief, member } = current(); const { task, run } = await linkedFlow();
    await request(app).delete(`/users/${member.user.id}`).set('Authorization', bearer(chief)).expect(204);
    await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'EM_ANDAMENTO' }).expect(401);
    await request(app).post('/auth/refresh').send({ refreshToken: member.refreshToken }).expect(401);
    expect(taskSchema.parse((await request(app).get(`/tasks/${task.id}`).set('Authorization', bearer(chief)).expect(200)).body).assigneeId).toBe(member.user.id);
    expect(checklistRunSchema.parse((await request(app).get(`/checklists/runs/${run.id}`).set('Authorization', bearer(chief)).expect(200)).body).assigneeId).toBe(member.user.id);
    expect(userDetailSchema.parse((await request(app).get(`/users/${member.user.id}`).set('Authorization', bearer(chief)).expect(200)).body).isActive).toBe(false);
    await request(app).post('/tasks').set('Authorization', bearer(chief)).send({ title: 'Indevida', assigneeId: member.user.id }).expect(409);
  });

  it('atribuição incompatível com checklist não grava tarefa nem evento parcial', async () => {
    const { app, chief, peer } = current(); const { task, run } = await linkedFlow();
    const invalid = await request(app).post('/tasks').set('Authorization', bearer(chief)).send({ title: 'Indevida', assigneeId: peer.user.id, checklistRunId: run.id }).expect(409);
    expect(apiErrorSchema.parse(invalid.body).error.code).toBe('TASK_CHECKLIST_MISMATCH');
    await request(app).patch(`/tasks/${task.id}/assignee`).set('Authorization', bearer(chief)).send({ assigneeId: peer.user.id }).expect(409);
    const events = taskEventPageSchema.parse((await request(app).get(`/tasks/${task.id}/history`).set('Authorization', bearer(chief)).expect(200)).body);
    expect(events.items).toHaveLength(1);
    expect(taskPageSchema.parse((await request(app).get('/tasks').set('Authorization', bearer(chief)).expect(200)).body).items).toHaveLength(1);
  });

  it('conclusão e cancelamento concorrentes deixam um único estado terminal', async () => {
    const { app, chief } = current(); const header = bearer(chief);
    const task = taskSchema.parse((await request(app).post('/tasks').set('Authorization', header).send({ title: 'Tarefa concorrente' }).expect(201)).body);
    await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', header).send({ status: 'EM_ANDAMENTO' }).expect(200);
    const results = await Promise.all(['CONCLUIDA', 'CANCELADA'].map((status) => request(app).patch(`/tasks/${task.id}/status`).set('Authorization', header).send({ status })));
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const final = taskSchema.parse((await request(app).get(`/tasks/${task.id}`).set('Authorization', header).expect(200)).body);
    expect(['CONCLUIDA', 'CANCELADA']).toContain(final.status);
    const history = taskEventPageSchema.parse((await request(app).get(`/tasks/${task.id}/history`).set('Authorization', header).expect(200)).body);
    expect(history.items).toHaveLength(3); expect(history.items.at(-1)?.toStatus).toBe(final.status);
    expect(final.completedAt !== null).toBe(final.status === 'CONCLUIDA'); expect(final.cancelledAt !== null).toBe(final.status === 'CANCELADA');
  });

  it('desmarcação concorrente com conclusão mantém tarefa e checklist consistentes', async () => {
    const { app, member, chief } = current(); const { task, run } = await linkedFlow(); await completeChecklist(run);
    await request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'EM_ANDAMENTO' }).expect(200);
    const item = run.items[0]; if (!item) throw new Error('Item ausente.');
    const [completion, unmark] = await Promise.all([
      request(app).patch(`/tasks/${task.id}/status`).set('Authorization', bearer(member)).send({ status: 'CONCLUIDA' }),
      request(app).patch(`/checklists/runs/${run.id}/items/${item.id}`).set('Authorization', bearer(member)).send({ isCompleted: false }),
    ]);
    expect([completion.status, unmark.status].sort()).toEqual([200, 409]);
    const finalTask = taskSchema.parse((await request(app).get(`/tasks/${task.id}`).set('Authorization', bearer(chief)).expect(200)).body);
    const finalRun = checklistRunSchema.parse((await request(app).get(`/checklists/runs/${run.id}`).set('Authorization', bearer(chief)).expect(200)).body);
    expect(finalTask.status === 'CONCLUIDA').toBe(finalRun.status === 'CONCLUIDA');
    expect(finalRun.completedItems).toBe(finalTask.status === 'CONCLUIDA' ? 2 : 1);
  });

  it('filtros combinados e paginação de histórico não repetem eventos', async () => {
    const { app, chief, member } = current(); const { task, routine } = await linkedFlow();
    await request(app).patch(`/tasks/${task.id}`).set('Authorization', bearer(chief)).send({ title: 'Tarefa editada' }).expect(200);
    const response = await request(app).get('/tasks').set('Authorization', bearer(member)).query({ assigneeId: member.user.id, routineId: routine.id, priority: 'ALTA', status: 'ABERTA', overdue: 'true', dueFrom: '1999-01-01', dueTo: '2001-01-01' }).expect(200);
    expect(taskPageSchema.parse(response.body).items.map((entry) => entry.id)).toEqual([task.id]);
    const first = taskEventPageSchema.parse((await request(app).get(`/tasks/${task.id}/history`).set('Authorization', bearer(member)).query({ limit: 1 }).expect(200)).body);
    expect(first.nextCursor).not.toBeNull();
    const next = taskEventPageSchema.parse((await request(app).get(`/tasks/${task.id}/history`).set('Authorization', bearer(member)).query({ limit: 1, cursor: first.nextCursor }).expect(200)).body);
    expect(next.items).toHaveLength(1); expect(next.items[0]?.id).not.toBe(first.items[0]?.id); expect(next.nextCursor).toBeNull();
  });
});
