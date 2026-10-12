import { expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { loginResponseSchema, checklistRunPageSchema, taskPageSchema } from '@gabinete-plus/shared';
import { createIntegrationFixture } from './database.test-helper.js';
import { hashPassword } from '../modules/users/password.js';
it.skipIf(!process.env.TEST_DATABASE_URL)('seed completo: recriação, papéis, snapshots, estados e idempotência sem sobrescrever trabalho', async () => {
  const fixture = await createIntegrationFixture(); const app = await fixture.reset();
  try {
    await fixture.client.query('TRUNCATE TABLE users CASCADE');
    const { seedDemoDataset } = await import('../modules/demo/demo.repository.js'); const hash = await hashPassword(fixture.password); await seedDemoDataset(hash, '2026-10-12');
    const counts = async () => z.array(z.object({ users: z.number(), runs: z.number(), tasks: z.number(), events: z.number(), items: z.number() })).parse((await fixture.client.query('SELECT (SELECT count(*)::int FROM users) users, (SELECT count(*)::int FROM checklist_runs) runs, (SELECT count(*)::int FROM tasks) tasks, (SELECT count(*)::int FROM task_events) events, (SELECT count(*)::int FROM checklist_run_items) items')).rows);
    const before = await counts(); await seedDemoDataset(await hashPassword('Outra-senha-ficticia-44'), '2026-10-12'); expect(await counts()).toEqual(before);
    const member = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'assessor1@example.invalid', password: fixture.password }).expect(200)).body); const support = loginResponseSchema.parse((await request(app).post('/auth/login').send({ email: 'apoio@example.invalid', password: fixture.password }).expect(200)).body); expect(support.user.role).toBe('APOIO');
    const runs = checklistRunPageSchema.parse((await request(app).get('/checklists/runs').set('Authorization', `Bearer ${member.accessToken}`).expect(200)).body); expect(runs.items).toHaveLength(2); expect(runs.items.find((row) => row.id === 'demo-run-email-history')?.progress).toBe(100); expect(runs.items.find((row) => row.id === 'demo-run-email-current')?.completedItems).toBe(1);
    const tasks = taskPageSchema.parse((await request(app).get('/tasks').set('Authorization', `Bearer ${support.accessToken}`).expect(200)).body); expect(new Set(tasks.items.map((task) => task.status))).toEqual(new Set(['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])); expect(tasks.items.find((task) => task.id === 'demo-task-overdue')?.isOverdue).toBe(true);
    await fixture.client.query('UPDATE tasks SET title = $1 WHERE id = $2', ['Título alterado pelo usuário', 'demo-task-overdue']); await seedDemoDataset(hash, '2026-10-12'); expect(z.array(z.object({ title: z.string() })).parse((await fixture.client.query('SELECT title FROM tasks WHERE id = $1', ['demo-task-overdue'])).rows)[0]?.title).toBe('Título alterado pelo usuário');
  } finally { await fixture.close(); }
});
