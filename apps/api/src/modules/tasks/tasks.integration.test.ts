import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { checklistRunSchema, loginResponseSchema, taskEventPageSchema, taskPageSchema, taskSchema } from '@gabinete-plus/shared';
import { hashPassword } from '../users/password.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('tarefas: CRUD, distribuição, transições, histórico e checklist com PostgreSQL', async () => {
  const testUrl = process.env.TEST_DATABASE_URL; if (!testUrl) throw new Error('TEST_DATABASE_URL obrigatória.');
  const databaseName = `tasks31_${randomUUID().replaceAll('-', '')}`; const url = new URL(testUrl); url.pathname = `/${databaseName}`;
  const admin = new Client({ connectionString: testUrl }); const client = new Client({ connectionString: url.toString() }); let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`); created = true; await client.connect();
    for (const name of ['20260731235902_init', '20261011000100_user_positions', '20261011000200_auth_sessions', '20261011000300_routines', '20261011000400_checklists', '20261011000500_contacts', '20261011000600_tasks']) {
      await client.query(await readFile(new URL(`../../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
    }
    process.env.DATABASE_URL = url.toString(); const { createApp } = await import('../../app.js');
    const { seedDemoUsers } = await import('../users/users.repository.js'); const { seedDemoRoutines } = await import('../routines/routines.repository.js');
    const { seedDemoChecklists } = await import('../checklists/checklists.repository.js'); const { seedDemoTasks } = await import('./tasks.repository.js');
    const { prisma } = await import('../../lib/prisma.js');
    try {
      const password = 'Senha-ficticia-tarefas-31'; await seedDemoUsers(await hashPassword(password)); await seedDemoRoutines(); await seedDemoChecklists(); await seedDemoTasks(); await seedDemoTasks();
      const app = createApp(); const login = async (email: string) => { const response = await request(app).post('/auth/login').send({ email, password }).expect(200); return loginResponseSchema.parse(response.body); };
      const chief = await login('chefia@example.invalid'); const member = await login('assessor1@example.invalid'); const peer = await login('apoio@example.invalid');
      const chiefHeader = `Bearer ${chief.accessToken}`; const memberHeader = `Bearer ${member.accessToken}`; const peerHeader = `Bearer ${peer.accessToken}`;
      await request(app).get('/tasks').expect(401);
      await request(app).post('/tasks').set('Authorization', memberHeader).send({ title: 'Indevida', assigneeId: peer.user.id }).expect(403);
      await request(app).post('/tasks').set('Authorization', chiefHeader).send({ title: 'Inválida', assigneeId: 'missing' }).expect(409);
      await request(app).post('/tasks').set('Authorization', memberHeader).send({ title: 'Inválida', dueDate: '2026-02-30' }).expect(400);
      const own = taskSchema.parse((await request(app).post('/tasks').set('Authorization', memberHeader).send({ title: 'Tarefa própria', dueDate: '2000-01-01', priority: 'ALTA' }).expect(201)).body);
      expect(own.assigneeId).toBe(member.user.id); expect(own.isOverdue).toBe(true);
      await request(app).patch(`/tasks/${own.id}`).set('Authorization', peerHeader).send({ title: 'Indevido' }).expect(403);
      await request(app).patch(`/tasks/${own.id}/status`).set('Authorization', peerHeader).send({ status: 'EM_ANDAMENTO' }).expect(403);
      await request(app).delete(`/tasks/${own.id}`).set('Authorization', peerHeader).expect(403);
      await request(app).patch(`/tasks/${own.id}`).set('Authorization', memberHeader).send({ title: 'Tarefa atualizada' }).expect(200);
      await request(app).patch(`/tasks/${own.id}/status`).set('Authorization', memberHeader).send({ status: 'CONCLUIDA' }).expect(409);
      const concurrent = await Promise.all([1, 2].map(() => request(app).patch(`/tasks/${own.id}/status`).set('Authorization', memberHeader).send({ status: 'EM_ANDAMENTO' })));
      expect(concurrent.map((response) => response.status)).toEqual([200, 200]);
      await request(app).patch(`/tasks/${own.id}/status`).set('Authorization', memberHeader).send({ status: 'CONCLUIDA' }).expect(200);
      await request(app).patch(`/tasks/${own.id}/status`).set('Authorization', memberHeader).send({ status: 'CONCLUIDA' }).expect(200);
      await request(app).delete(`/tasks/${own.id}`).set('Authorization', memberHeader).expect(409);
      await request(app).patch(`/tasks/${own.id}`).set('Authorization', memberHeader).send({ title: 'Encerrada' }).expect(409);
      const history = taskEventPageSchema.parse((await request(app).get(`/tasks/${own.id}/history`).set('Authorization', memberHeader).expect(200)).body);
      expect(history.items.map((event) => event.type)).toEqual(['CREATED', 'EDITED', 'STATUS_CHANGED', 'STATUS_CHANGED']);
      const reassign = taskSchema.parse((await request(app).post('/tasks').set('Authorization', memberHeader).send({ title: 'Reatribuir' }).expect(201)).body);
      await request(app).patch(`/tasks/${reassign.id}/assignee`).set('Authorization', memberHeader).send({ assigneeId: peer.user.id }).expect(200);
      await request(app).patch(`/tasks/${reassign.id}/status`).set('Authorization', memberHeader).send({ status: 'EM_ANDAMENTO' }).expect(403);
      await request(app).patch(`/tasks/${reassign.id}/status`).set('Authorization', peerHeader).send({ status: 'EM_ANDAMENTO' }).expect(200);
      await request(app).delete(`/tasks/${reassign.id}`).set('Authorization', memberHeader).expect(204);
      await request(app).delete(`/tasks/${reassign.id}`).set('Authorization', memberHeader).expect(204);
      expect(taskSchema.parse((await request(app).get(`/tasks/${reassign.id}`).set('Authorization', memberHeader).expect(200)).body).status).toBe('CANCELADA');
      const run = checklistRunSchema.parse((await request(app).post('/checklists/templates/demo-checklist-email/runs').set('Authorization', memberHeader).send({ date: '2026-10-11' }).expect(201)).body);
      const linked = taskSchema.parse((await request(app).post('/tasks').set('Authorization', memberHeader).send({ title: 'Tarefa com checklist', checklistRunId: run.id }).expect(201)).body);
      expect(linked.routineId).toBe(run.routineId); expect(linked.instructions).toBe(run.instructionsSnapshot);
      await request(app).patch(`/tasks/${linked.id}/assignee`).set('Authorization', chiefHeader).send({ assigneeId: peer.user.id }).expect(409);
      await request(app).patch(`/tasks/${linked.id}/status`).set('Authorization', memberHeader).send({ status: 'EM_ANDAMENTO' }).expect(200);
      await request(app).patch(`/tasks/${linked.id}/status`).set('Authorization', memberHeader).send({ status: 'CONCLUIDA' }).expect(409);
      for (const item of run.items) await request(app).patch(`/checklists/runs/${run.id}/items/${item.id}`).set('Authorization', memberHeader).send({ isCompleted: true }).expect(200);
      await request(app).patch(`/tasks/${linked.id}/status`).set('Authorization', memberHeader).send({ status: 'CONCLUIDA' }).expect(200);
      const item = run.items[0]; if (!item) throw new Error('Checklist vazio.');
      await request(app).patch(`/checklists/runs/${run.id}/items/${item.id}`).set('Authorization', memberHeader).send({ isCompleted: false }).expect(409);
      const ordered = [];
      for (const input of [{ title: 'Ordenar A', dueDate: '2026-10-11', priority: 'NORMAL' }, { title: 'Ordenar B', dueDate: '2026-10-11', priority: 'URGENTE' }, { title: 'Ordenar C', dueDate: null, priority: 'URGENTE' }, { title: 'Ordenar D', dueDate: null, priority: 'BAIXA' }]) {
        ordered.push(taskSchema.parse((await request(app).post('/tasks').set('Authorization', chiefHeader).send(input).expect(201)).body));
      }
      const ids: string[] = []; let cursor: string | null = null;
      do { const response = await request(app).get('/tasks').query({ q: 'Ordenar', limit: 1, ...(cursor ? { cursor } : {}) }).set('Authorization', memberHeader).expect(200);
        const page = taskPageSchema.parse(response.body); ids.push(...page.items.map((task) => task.id)); cursor = page.nextCursor;
      } while (cursor);
      expect(ids).toEqual([ordered[1]?.id, ordered[0]?.id, ordered[2]?.id, ordered[3]?.id]);
      await request(app).get('/tasks').query({ cursor: 'abc' }).set('Authorization', memberHeader).expect(400);
      await request(app).get('/tasks').query({ limit: 101 }).set('Authorization', memberHeader).expect(400);
      expect(taskPageSchema.parse((await request(app).get('/tasks').query({ overdue: 'true' }).set('Authorization', memberHeader).expect(200)).body).items.every((task) => task.isOverdue)).toBe(true);
      await request(app).patch('/tasks/demo-task-conferencia').set('Authorization', chiefHeader).send({ title: 'Seed preservado' }).expect(200);
      await seedDemoTasks(); expect(taskSchema.parse((await request(app).get('/tasks/demo-task-conferencia').set('Authorization', memberHeader).expect(200)).body).title).toBe('Seed preservado');
    } finally { await prisma.$disconnect(); }
  } finally { await client.end(); if (created) await admin.query(`DROP DATABASE "${databaseName}"`); await admin.end(); }
}, 20000);
