import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRoutineSchema, routineListQuerySchema, routineSchema, updateRoutineSchema } from './routines.js';

it('aceita frequências do catálogo e data sem horário', () => {
  const routine = createRoutineSchema.parse({ title: ' Reunião ', category: 'Administrativo', frequency: 'QUINZENAL', specificDate: '2026-11-03' });
  expect(routine.title).toBe('Reunião');
  expect(routine.specificDate).toBe('2026-11-03');
  expect(routine.steps).toEqual([]);
});
it('exige descrição de frequência personalizada e rejeita datas inválidas', () => {
  const basic = { title: 'Rotina', category: 'Administrativo', frequency: 'PERSONALIZADA' };
  expect(createRoutineSchema.safeParse(basic).success).toBe(false);
  expect(createRoutineSchema.safeParse({ ...basic, frequencyDetails: 'A cada dois dias úteis' }).success).toBe(true);
  expect(createRoutineSchema.safeParse({ ...basic, frequency: 'EVENTUAL', specificDate: '2026-02-30' }).success).toBe(false);
});
it('não permite campos de autoria/status pelo cliente nem edição vazia', () => {
  expect(updateRoutineSchema.safeParse({}).success).toBe(false);
  expect(updateRoutineSchema.safeParse({ title: 'Título', isArchived: false }).success).toBe(false);
  expect(createRoutineSchema.safeParse({ title: 'Título', category: 'Administrativo', frequency: 'DIARIA', createdById: 'outro' }).success).toBe(false);
});
it('lista ativos por padrão, interpreta false e limita paginação', () => {
  expect(routineListQuerySchema.parse({}).isArchived).toBe(false);
  expect(routineListQuerySchema.parse({ isArchived: 'true' }).isArchived).toBe(true);
  expect(routineListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
});
it('valida exemplo OpenAPI preservando data sem fuso', async () => {
  const example = routineSchema.parse(JSON.parse(await readFile(new URL('../../../openapi/examples/routine.json', import.meta.url), 'utf8')));
  expect(example.specificDate).toBe('2026-11-03');
});
