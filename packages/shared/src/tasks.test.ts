import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createTaskSchema, taskListQuerySchema, taskPriorityRank, taskSchema, updateTaskSchema } from './tasks.js';
it('valida datas, prioridades, autoria e atualização não vazia', () => {
  expect(createTaskSchema.parse({ title: ' Tarefa ' }).priority).toBe('NORMAL');
  expect(createTaskSchema.safeParse({ title: 'Tarefa', dueDate: '2026-02-30' }).success).toBe(false);
  expect(createTaskSchema.safeParse({ title: 'Tarefa', createdById: 'other' }).success).toBe(false);
  expect(updateTaskSchema.safeParse({}).success).toBe(false); expect(taskPriorityRank('URGENTE')).toBe(3);
});
it('limita páginas e interpreta filtros de prazo e atraso', () => {
  expect(taskListQuerySchema.parse({ overdue: 'false' }).overdue).toBe(false);
  expect(taskListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(taskListQuerySchema.safeParse({ dueFrom: '2026-10-12', dueTo: '2026-10-11' }).success).toBe(false);
});
it('exemplo de tarefa segue contrato público', async () => {
  const example = taskSchema.parse(JSON.parse(await readFile(new URL('../../../openapi/examples/task.json', import.meta.url), 'utf8')));
  expect(example.status).toBe('ABERTA'); expect(example).not.toHaveProperty('priorityRank');
});
