import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { checklistRunQuerySchema, checklistRunSchema, createChecklistSchema, markChecklistItemSchema, updateChecklistSchema } from './checklists.js';

it('exige itens válidos e impede campos de autoria/versão pelo cliente', () => {
  expect(createChecklistSchema.safeParse({ routineId: 'routine', title: 'Modelo', items: [] }).success).toBe(false);
  expect(createChecklistSchema.safeParse({ routineId: 'routine', title: 'Modelo', version: 100 }).success).toBe(false);
  expect(updateChecklistSchema.safeParse({}).success).toBe(false);
});
it('marcação aceita false e rejeita autor/horário externos', () => {
  expect(markChecklistItemSchema.parse({ isCompleted: false }).isCompleted).toBe(false);
  expect(markChecklistItemSchema.safeParse({ isCompleted: true, completedById: 'outro' }).success).toBe(false);
});
it('histórico limita página e valida intervalo', () => {
  expect(checklistRunQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(checklistRunQuerySchema.safeParse({ from: '2026-11-01', to: '2026-10-01' }).success).toBe(false);
});
it('exemplo OpenAPI preserva snapshot e progresso coerentes', async () => {
  const example = checklistRunSchema.parse(JSON.parse(await readFile(new URL('../../../openapi/examples/checklist-run.json', import.meta.url), 'utf8')));
  expect(example.items).toHaveLength(example.totalItems); expect(example.progress).toBe(0);
});
