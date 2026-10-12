import { taskFixture } from '../dashboard/fixtures.test-helper';
import { initialTaskValues, taskActions, taskChanges, taskFormSchema, taskPayload } from './model';
const actor = { id: 'actor', name: 'Pessoa fictícia', email: 'pessoa@example.invalid', role: 'ASSESSOR', isActive: true } satisfies import('@gabinete-plus/shared').UserSummary;
it('valida título e prazo civil e mantém ausência de prazo', () => {
  const values = initialTaskValues('actor'); expect(taskFormSchema.safeParse(values).success).toBe(false); values.title = 'Tarefa'; values.dueDate = '31/02/2026'; expect(taskFormSchema.safeParse(values).success).toBe(false);
  values.dueDate = '12/10/2026'; expect(taskPayload(values).dueDate).toBe('2026-10-12'); values.dueDate = ''; expect(taskPayload(values).dueDate).toBeNull();
});
it('omite orientações vazias no cadastro para permitir herança da rotina', () => {
  const values = initialTaskValues('actor'); values.title = 'Tarefa'; values.routineId = 'routine-1'; expect(taskPayload(values).instructions).toBeUndefined(); values.instructions = 'Orientação\nEspecífica'; expect(taskPayload(values).instructions).toBe('Orientação\nEspecífica');
});
it('PATCH é mínimo, limpa orientações explicitamente e preserva vínculos', () => {
  const task = taskFixture({ instructions: 'Original', dueDate: '2026-10-12', routineId: 'r', contactId: 'c' }); const values = initialTaskValues('actor', task); expect(taskChanges(task, values)).toBeNull();
  values.instructions = ''; values.dueDate = ''; values.title = 'Novo título'; expect(taskChanges(task, values)).toEqual({ instructions: '', dueDate: null, title: 'Novo título' });
});
it('criador e responsável possuem controles distintos e encerradas não reabrem', () => {
  const task = taskFixture({ assigneeId: 'other' }); expect(taskActions(task, actor)).toEqual({ edit: true, assign: true, cancel: true, start: false, complete: false });
  expect(taskActions({ ...task, createdById: 'other', assigneeId: 'actor' }, actor)).toEqual({ edit: false, assign: false, cancel: false, start: true, complete: false });
  expect(taskActions({ ...task, status: 'CONCLUIDA' }, { ...actor, role: 'CHEFE' })).toEqual({ edit: false, assign: false, cancel: false, start: false, complete: false });
});
it('valida limites de textos e mantém multiline no formulário', () => {
  const values = initialTaskValues('actor', taskFixture({ description: 'Linha 1\nLinha 2' })); expect(taskPayload(values).description).toBe('Linha 1\nLinha 2'); values.instructions = 'x'.repeat(12001); expect(taskFormSchema.safeParse(values).success).toBe(false);
});
