import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import request from 'supertest';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { checklistRunPageSchema, checklistRunSchema, checklistTemplatePageSchema, checklistTemplateSchema, loginResponseSchema } from '@gabinete-plus/shared';
import { hashPassword } from '../users/password.js';

it.skipIf(!process.env.TEST_DATABASE_URL)('snapshots, concorrência, progresso, autoria e histórico com PostgreSQL real', async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL é obrigatória.');
  const databaseName = `checklists29_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(testUrl); url.pathname = `/${databaseName}`;
  const admin = new Client({ connectionString: testUrl }); const client = new Client({ connectionString: url.toString() });
  let created = false; await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`); created = true; await client.connect();
    for (const name of ['20260731235902_init', '20261011000100_user_positions', '20261011000200_auth_sessions', '20261011000300_routines', '20261011000400_checklists', '20261011000500_contacts', '20261011000600_tasks']) {
      await client.query(await readFile(new URL(`../../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'));
    }
    process.env.DATABASE_URL = url.toString();
    const { createApp } = await import('../../app.js'); const { seedDemoUsers } = await import('../users/users.repository.js');
    const { seedDemoRoutines } = await import('../routines/routines.repository.js'); const { seedDemoChecklists } = await import('./checklists.repository.js');
    const { prisma } = await import('../../lib/prisma.js');
    try {
      const password = 'Senha-ficticia-checklists-29';
      await seedDemoUsers(await hashPassword(password)); await seedDemoRoutines(); await seedDemoChecklists(); await seedDemoChecklists();
      const app = createApp(); const login = async (email: string) => {
        const response = await request(app).post('/auth/login').send({ email, password }); expect(response.status).toBe(200);
        return loginResponseSchema.parse(response.body);
      };
      const chief = await login('chefia@example.invalid'); const owner = await login('assessor1@example.invalid'); const other = await login('assessor2@example.invalid');
      const chiefHeader = `Bearer ${chief.accessToken}`; const ownerHeader = `Bearer ${owner.accessToken}`; const otherHeader = `Bearer ${other.accessToken}`;
      expect((await request(app).get('/checklists/templates')).status).toBe(401);
      const models = await request(app).get('/checklists/templates').set('Authorization', ownerHeader);
      expect(checklistTemplatePageSchema.parse(models.body).items).toHaveLength(1);
      const input = { routineId: 'demo-routine-email', title: 'Modelo Fictício', items: ['Item original A', 'Item original B'] };
      expect((await request(app).post('/checklists/templates').set('Authorization', ownerHeader).send(input)).status).toBe(403);
      const templateResponse = await request(app).post('/checklists/templates').set('Authorization', chiefHeader).send(input);
      expect(templateResponse.status).toBe(201); const template = checklistTemplateSchema.parse(templateResponse.body);
      const runPath = `/checklists/templates/${template.id}/runs`;
      const concurrent = await Promise.all([
        request(app).post(runPath).set('Authorization', ownerHeader).send({ date: '2026-10-11' }),
        request(app).post(runPath).set('Authorization', ownerHeader).send({ date: '2026-10-11' }),
      ]);
      expect(concurrent.map((response) => response.status).sort()).toEqual([200, 201]);
      const run = checklistRunSchema.parse(concurrent[0].body);
      expect(checklistRunSchema.parse(concurrent[1].body).id).toBe(run.id);
      expect(run.items.map((item) => item.text)).toEqual(input.items);
      const count = z.array(z.object({ count: z.coerce.number() })).parse((await client.query('SELECT count(*) AS count FROM checklist_runs WHERE "templateId" = $1 AND "periodKey" = $2', [template.id, run.periodKey])).rows);
      expect(count[0]?.count).toBe(1);
      const first = run.items[0]; const second = run.items[1]; if (!first || !second) throw new Error('Itens não gerados.');
      const itemPath = `/checklists/runs/${run.id}/items/${first.id}`;
      expect((await request(app).patch(itemPath).set('Authorization', otherHeader).send({ isCompleted: true })).status).toBe(403);
      expect((await request(app).patch(itemPath).set('Authorization', ownerHeader).send({ isCompleted: true, completedById: chief.user.id })).status).toBe(400);
      const marked = await request(app).patch(itemPath).set('Authorization', ownerHeader).send({ isCompleted: true }); expect(marked.status).toBe(200);
      const half = checklistRunSchema.parse(marked.body); expect(half.progress).toBe(50); expect(half.status).toBe('EM_ANDAMENTO');
      expect(half.items[0]?.completedById).toBe(owner.user.id); expect(half.items[0]?.completedAt).not.toBeNull();
      const repeated = checklistRunSchema.parse((await request(app).patch(itemPath).set('Authorization', ownerHeader).send({ isCompleted: true })).body);
      expect(repeated.completedItems).toBe(1); expect(repeated.items[0]?.completedAt).toBe(half.items[0]?.completedAt);
      const completed = checklistRunSchema.parse((await request(app).patch(`/checklists/runs/${run.id}/items/${second.id}`).set('Authorization', chiefHeader).send({ isCompleted: true })).body);
      expect(completed.progress).toBe(100); expect(completed.status).toBe('CONCLUIDA'); expect(completed.items[1]?.completedById).toBe(chief.user.id);
      const history = await request(app).get('/checklists/runs').query({ from: '2026-10-11', to: '2026-10-11', status: 'CONCLUIDA', assigneeId: owner.user.id }).set('Authorization', otherHeader);
      expect(checklistRunPageSchema.parse(history.body).items.map((entry) => entry.id)).toContain(run.id);
      const changed = await request(app).patch(`/checklists/templates/${template.id}`).set('Authorization', chiefHeader).send({ title: 'Modelo Atualizado', items: ['Item novo A', 'Item novo B', 'Item novo C'] });
      expect(changed.status).toBe(200); expect(checklistTemplateSchema.parse(changed.body).version).toBe(2);
      await request(app).patch('/routines/demo-routine-email').set('Authorization', chiefHeader).send({ instructions: 'Instrução nova' }).expect(200);
      const old = checklistRunSchema.parse((await request(app).get(`/checklists/runs/${run.id}`).set('Authorization', ownerHeader)).body);
      expect(old.items.map((item) => item.text)).toEqual(input.items); expect(old.templateVersion).toBe(1); expect(old.instructionsSnapshot).toBe(run.instructionsSnapshot);
      const newResponse = await request(app).post(runPath).set('Authorization', ownerHeader).send({ date: '2026-10-12' }); expect(newResponse.status).toBe(201);
      const nextRun = checklistRunSchema.parse(newResponse.body); expect(nextRun.items).toHaveLength(3); expect(nextRun.templateVersion).toBe(2); expect(nextRun.instructionsSnapshot).toBe('Instrução nova');
      const parallelRun = checklistRunSchema.parse((await request(app).post(runPath).set('Authorization', ownerHeader).send({ date: '2026-10-13' })).body);
      const parallelItems = parallelRun.items.slice(0, 2);
      expect(parallelItems).toHaveLength(2);
      await Promise.all(parallelItems.map((item) => request(app).patch(`/checklists/runs/${parallelRun.id}/items/${item.id}`).set('Authorization', ownerHeader).send({ isCompleted: true }).expect(200)));
      const parallelResult = checklistRunSchema.parse((await request(app).get(`/checklists/runs/${parallelRun.id}`).set('Authorization', ownerHeader)).body);
      expect(parallelResult.completedItems).toBe(2); expect(parallelResult.progress).toBe(67);
      expect((await request(app).patch(`/checklists/runs/${nextRun.id}/items/${first.id}`).set('Authorization', chiefHeader).send({ isCompleted: true })).status).toBe(404);
      const reopened = checklistRunSchema.parse((await request(app).patch(itemPath).set('Authorization', ownerHeader).send({ isCompleted: false })).body);
      expect(reopened.progress).toBe(50); expect(reopened.completedAt).toBeNull(); expect(reopened.items[0]?.completedAt).toBeNull();
      const runPage = checklistRunPageSchema.parse((await request(app).get('/checklists/runs').query({ templateId: template.id, limit: 1 }).set('Authorization', ownerHeader)).body);
      expect(runPage.items).toHaveLength(1); expect(runPage.nextCursor).not.toBeNull();
      const pageTwo = checklistRunPageSchema.parse((await request(app).get('/checklists/runs').query({ templateId: template.id, limit: 1, cursor: runPage.nextCursor }).set('Authorization', ownerHeader)).body);
      expect(pageTwo.items[0]?.id).not.toBe(runPage.items[0]?.id);
      expect((await request(app).post(runPath).set('Authorization', otherHeader).send({ date: '2026-10-11' })).status).toBe(403);
      expect((await request(app).post(runPath).set('Authorization', ownerHeader).send({ date: '2026-10-13', assigneeId: other.user.id })).status).toBe(403);
      for (let repeat = 0; repeat < 2; repeat++) await request(app).delete(`/checklists/templates/${template.id}`).set('Authorization', chiefHeader).expect(204);
      expect((await request(app).post(runPath).set('Authorization', ownerHeader).send({ date: '2026-10-13' })).status).toBe(409);
      expect((await request(app).patch(`/checklists/templates/${template.id}`).set('Authorization', chiefHeader).send({ title: 'Indevido' })).status).toBe(409);
      await request(app).delete('/routines/demo-routine-email').set('Authorization', chiefHeader).expect(204);
      await request(app).patch(itemPath).set('Authorization', ownerHeader).send({ isCompleted: true }).expect(200);
      await request(app).delete(`/users/${owner.user.id}`).set('Authorization', chiefHeader).expect(204);
      expect((await request(app).patch(itemPath).set('Authorization', ownerHeader).send({ isCompleted: false })).status).toBe(401);
      const pendingItem = nextRun.items[0]; if (!pendingItem) throw new Error('Item pendente ausente.');
      await request(app).patch(`/checklists/runs/${nextRun.id}/items/${pendingItem.id}`).set('Authorization', chiefHeader).send({ isCompleted: true }).expect(200);
      expect((await request(app).get(`/checklists/runs/${run.id}`).set('Authorization', otherHeader)).status).toBe(200);
    } finally { await prisma.$disconnect(); }
  } finally { await client.end(); if (created) await admin.query(`DROP DATABASE "${databaseName}"`); await admin.end(); }
}, 20000);
