import { expect, it, vi } from 'vitest';
import { createTaskSchema, taskListQuerySchema, type UserRole } from '@gabinete-plus/shared';
import { AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { TasksService } from './tasks.service.js';
import type { StoredTask, TaskMutation, TasksRepository } from './tasks.repository.js';
function fixture(role: UserRole = 'ASSESSOR') {
  const user = { id: 'actor', name: 'Pessoa Fictícia', email: 'actor@example.invalid', role, isActive: true };
  const principal: SessionPrincipal = { user, sessionId: 'session', expiresAt: new Date(Date.now() + 86400000) };
  const task: StoredTask = { id: 'task', title: 'Expediente fictício', description: '', instructions: '', priority: 'NORMAL', priorityRank: 1,
    dueDate: new Date('2000-01-01T00:00:00Z'), status: 'ABERTA', assigneeId: user.id, createdById: user.id, updatedById: user.id,
    routineId: null, checklistRunId: null, contactId: null, startedAt: null, completedAt: null, completedById: null, cancelledAt: null, cancelledById: null, createdAt: new Date(), updatedAt: new Date() };
  const status = vi.fn((row: StoredTask, next: StoredTask['status']) => { row.status = next; return Promise.resolve(row); });
  const context: TaskMutation = { actor: user, session: { id: 'session', user, expiresAt: principal.expiresAt, revokedAt: null }, target: task,
    assignee: (id) => Promise.resolve({ ...user, id }), routine: () => Promise.resolve(null), contact: () => Promise.resolve(null), run: () => Promise.resolve(null),
    create: () => Promise.resolve(task), update: () => Promise.resolve(task), assign: (row, id) => { row.assigneeId = id; return Promise.resolve(row); }, status };
  const list = vi.fn(() => Promise.resolve([task]));
  const repository: TasksRepository = { find: () => Promise.resolve(task), list, history: () => Promise.resolve([]),
    withActor(_actor, _session, _id, operation) { return operation(context); } };
  const authorization = new AuthorizationService({ verifyToken: () => Promise.resolve(null), findSession: () => Promise.resolve(null) });
  return { principal, task, context, status, list, service: new TasksService(authorization, repository) };
}
it('exige sequência de status e torna repetição idempotente', async () => {
  const { service, principal, task, status } = fixture();
  await expect(service.status(principal, task.id, 'CONCLUIDA')).rejects.toMatchObject({ code: 'TASK_INVALID_TRANSITION' });
  await service.status(principal, task.id, 'EM_ANDAMENTO'); await service.status(principal, task.id, 'EM_ANDAMENTO');
  await service.status(principal, task.id, 'CONCLUIDA'); expect(status).toHaveBeenCalledTimes(2);
  await expect(service.status(principal, task.id, 'ABERTA')).rejects.toMatchObject({ code: 'TASK_INVALID_TRANSITION' });
  await expect(service.status(principal, task.id, 'CANCELADA')).rejects.toMatchObject({ code: 'TASK_INVALID_TRANSITION' });
});
it('impede execução, edição e cancelamento por outro membro', async () => {
  const { service, principal, task, status } = fixture(); task.assigneeId = 'other'; task.createdById = 'other';
  await expect(service.status(principal, task.id, 'EM_ANDAMENTO')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(service.status(principal, task.id, 'CANCELADA')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(service.update(principal, task.id, { title: 'Indevido' })).rejects.toMatchObject({ code: 'FORBIDDEN' }); expect(status).not.toHaveBeenCalled();
});
it('permite ao criador reatribuir e cancelar sem perfil de chefia', async () => {
  const { service, principal, task } = fixture();
  expect((await service.assign(principal, task.id, 'other')).assigneeId).toBe('other');
  expect((await service.status(principal, task.id, 'CANCELADA')).status).toBe('CANCELADA');
  await expect(service.assign(principal, task.id, 'actor')).rejects.toMatchObject({ code: 'TASK_CLOSED' });
});
it('chefia executa tarefa de outro membro', async () => {
  const { service, principal, task } = fixture('CHEFE'); task.assigneeId = 'other'; task.createdById = 'other';
  expect((await service.status(principal, task.id, 'EM_ANDAMENTO')).status).toBe('EM_ANDAMENTO');
});
it('não permite criar tarefa inicialmente atribuída a terceiro sem chefia', async () => {
  const { service, principal } = fixture();
  await expect(service.create(principal, createTaskSchema.parse({ title: 'Tarefa', assigneeId: 'other' }))).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
it('revalida usuário, perfil e sessão dentro da transação', async () => {
  const { service, principal, context, task } = fixture('CHEFE');
  context.actor = { ...principal.user, role: 'APOIO' }; task.assigneeId = 'other';
  await expect(service.status(principal, task.id, 'EM_ANDAMENTO')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  context.actor = { ...principal.user, isActive: false };
  await expect(service.status(principal, task.id, 'EM_ANDAMENTO')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  context.actor = principal.user; context.session = null;
  await expect(service.status(principal, task.id, 'EM_ANDAMENTO')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
});
it('exige responsável ativo e checklist concluído', async () => {
  const { service, principal, context, task } = fixture();
  context.assignee = () => Promise.resolve(null);
  await expect(service.assign(principal, task.id, 'missing')).rejects.toMatchObject({ code: 'TASK_ASSIGNEE_INACTIVE' });
  task.status = 'EM_ANDAMENTO'; task.checklistRunId = 'run';
  await expect(service.status(principal, task.id, 'CONCLUIDA')).rejects.toMatchObject({ code: 'TASK_CHECKLIST_INCOMPLETE' });
});
it('deriva atraso e remove campo interno de prioridade', async () => {
  const { service, principal, task } = fixture(); expect(await service.get(principal, task.id)).toMatchObject({ isOverdue: true, dueDate: '2000-01-01' });
  expect(await service.get(principal, task.id)).not.toHaveProperty('priorityRank'); task.status = 'CANCELADA'; expect((await service.get(principal, task.id)).isOverdue).toBe(false);
});
it('rejeita cursor malformado antes de consultar o banco', async () => {
  const { service, principal, list } = fixture();
  await expect(service.list(principal, taskListQuerySchema.parse({ cursor: 'abc' }))).rejects.toMatchObject({ code: 'INVALID_CURSOR' }); expect(list).not.toHaveBeenCalled();
});
