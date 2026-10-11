import { createTaskSchema, taskCursorSchema, taskEventPageSchema, taskPageSchema, taskSchema, type CreateTask, type Task, type TaskHistoryQuery, type TaskListQuery, type UpdateTask } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { todayInGabinete } from '../checklists/period.js';
import type { StoredTask, TaskMutation, TasksRepository } from './tasks.repository.js';
const error = (code: string, message: string, status = 409): AppError => new AppError(code, message, status);
function view(row: StoredTask): Task {
  const dueDate = row.dueDate?.toISOString().slice(0, 10) ?? null;
  return taskSchema.parse({ ...row, dueDate, isOverdue: dueDate !== null && dueDate < todayInGabinete() && ['ABERTA', 'EM_ANDAMENTO'].includes(row.status),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null, cancelledAt: row.cancelledAt?.toISOString() ?? null });
}
function owner(principal: SessionPrincipal, task: StoredTask, kind: 'creator' | 'assignee'): void {
  if (principal.user.role !== 'CHEFE' && principal.user.id !== (kind === 'creator' ? task.createdById : task.assigneeId)) throw error('FORBIDDEN', 'Você não tem permissão para esta operação.', 403);
}
function open(task: StoredTask): void { if (task.status === 'CONCLUIDA' || task.status === 'CANCELADA') throw error('TASK_CLOSED', 'Tarefa encerrada não pode ser alterada.'); }
export class TasksService {
  constructor(private readonly authorization: AuthorizationService, private readonly repository: TasksRepository) {}
  private authorize(principal: SessionPrincipal, context: TaskMutation): SessionPrincipal {
    if (!context.actor || !context.session) throw unauthenticated();
    if (context.actor.id !== principal.user.id || context.session.id !== principal.sessionId || context.session.user.id !== principal.user.id || context.session.revokedAt || context.session.expiresAt <= new Date()) throw unauthenticated();
    const live = { ...principal, user: context.actor, expiresAt: context.session.expiresAt };
    this.authorization.requirePermission(live, 'tasks:execute-assigned'); return live;
  }
  private target(context: TaskMutation): StoredTask { if (!context.target) throw error('TASK_NOT_FOUND', 'Tarefa não encontrada.', 404); return context.target; }
  async list(principal: SessionPrincipal, query: TaskListQuery) {
    this.authorization.requirePermission(principal, 'tasks:read');
    let cursor = null;
    if (query.cursor) {
      try { cursor = taskCursorSchema.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'))); }
      catch { throw error('INVALID_CURSOR', 'Cursor de paginação inválido.', 400); }
    }
    const rows = await this.repository.list(query, cursor, todayInGabinete()); const visible = rows.slice(0, query.limit); const last = visible.at(-1);
    return taskPageSchema.parse({ items: visible.map(view), nextCursor: rows.length > query.limit && last ? Buffer.from(JSON.stringify({ id: last.id, dueDate: last.dueDate?.toISOString().slice(0, 10) ?? null, priorityRank: last.priorityRank })).toString('base64url') : null });
  }
  async get(principal: SessionPrincipal, id: string): Promise<Task> {
    this.authorization.requirePermission(principal, 'tasks:read'); const row = await this.repository.find(id);
    if (!row) throw error('TASK_NOT_FOUND', 'Tarefa não encontrada.', 404); return view(row);
  }
  async history(principal: SessionPrincipal, id: string, query: TaskHistoryQuery) {
    await this.get(principal, id); const rows = await this.repository.history(id, query); const visible = rows.slice(0, query.limit);
    return taskEventPageSchema.parse({ items: visible.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })), nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }
  async create(principal: SessionPrincipal, input: CreateTask): Promise<Task> {
    this.authorization.requirePermission(principal, 'tasks:execute-assigned');
    return this.repository.withActor(principal.user.id, principal.sessionId, null, async (context) => {
      const live = this.authorize(principal, context); const value = createTaskSchema.parse(input); const assigneeId = value.assigneeId ?? live.user.id;
      if (assigneeId !== live.user.id) this.authorization.requirePermission(live, 'tasks:assign');
      if (!(await context.assignee(assigneeId))?.isActive) throw error('TASK_ASSIGNEE_INACTIVE', 'Escolha um responsável ativo.');
      const run = value.checklistRunId ? await context.run(value.checklistRunId) : null;
      if (value.checklistRunId && !run) throw error('CHECKLIST_RUN_NOT_FOUND', 'Execução de checklist não encontrada.', 404);
      if (run && (run.assigneeId !== assigneeId || (value.routineId !== null && value.routineId !== run.routineId))) throw error('TASK_CHECKLIST_MISMATCH', 'Checklist incompatível com atividade ou responsável.');
      const routineId = value.routineId ?? run?.routineId ?? null; const routine = routineId ? await context.routine(routineId) : null;
      if (routineId && !routine) throw error('ROUTINE_NOT_FOUND', 'Atividade não encontrada.', 404);
      if (routine?.isArchived) throw error('ROUTINE_ARCHIVED', 'Atividade arquivada não recebe tarefas.');
      const contact = value.contactId ? await context.contact(value.contactId) : null;
      if (value.contactId && !contact) throw error('CONTACT_NOT_FOUND', 'Contato não encontrado.', 404);
      if (contact?.isArchived) throw error('CONTACT_ARCHIVED', 'Contato arquivado não recebe tarefas.');
      return view(await context.create({ title: value.title, description: value.description, instructions: value.instructions ?? routine?.instructions ?? '',
        priority: value.priority, dueDate: value.dueDate ? new Date(value.dueDate + 'T00:00:00Z') : null, assigneeId, routineId, checklistRunId: value.checklistRunId, contactId: value.contactId }));
    });
  }
  async update(principal: SessionPrincipal, id: string, input: UpdateTask): Promise<Task> {
    return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      const live = this.authorize(principal, context); const task = this.target(context); owner(live, task, 'creator'); open(task);
      return view(await context.update(id, input, Object.keys(input)));
    });
  }
  async assign(principal: SessionPrincipal, id: string, assigneeId: string): Promise<Task> {
    return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      const live = this.authorize(principal, context); const task = this.target(context); owner(live, task, 'creator'); open(task);
      if (!(await context.assignee(assigneeId))?.isActive) throw error('TASK_ASSIGNEE_INACTIVE', 'Escolha um responsável ativo.');
      if (task.checklistRunId && (await context.run(task.checklistRunId))?.assigneeId !== assigneeId) throw error('TASK_CHECKLIST_MISMATCH', 'Responsável deve corresponder ao checklist vinculado.');
      return view(task.assigneeId === assigneeId ? task : await context.assign(task, assigneeId));
    });
  }
  async status(principal: SessionPrincipal, id: string, status: Task['status']): Promise<Task> {
    return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      const live = this.authorize(principal, context); const task = this.target(context); owner(live, task, status === 'CANCELADA' ? 'creator' : 'assignee');
      if (task.status === status) return view(task);
      if (!((task.status === 'ABERTA' && status === 'EM_ANDAMENTO') || (task.status === 'EM_ANDAMENTO' && status === 'CONCLUIDA') || (['ABERTA', 'EM_ANDAMENTO'].includes(task.status) && status === 'CANCELADA'))) throw error('TASK_INVALID_TRANSITION', 'Transição de status não permitida.');
      if (status === 'CONCLUIDA' && task.checklistRunId && (await context.run(task.checklistRunId))?.status !== 'CONCLUIDA') throw error('TASK_CHECKLIST_INCOMPLETE', 'Conclua o checklist vinculado antes de finalizar a tarefa.');
      return view(await context.status(task, status));
    });
  }
}
