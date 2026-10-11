import { taskPriorityRank, type TaskCursor, type TaskHistoryQuery, type TaskListQuery, type UpdateTask, type UserSummary } from '@gabinete-plus/shared';
import type { Task, TaskEvent, Prisma, Routine, Contact, ChecklistRun } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { SessionSnapshot } from '../auth/session.repository.js';
export type { Task as StoredTask } from '../../generated/prisma/client.js';
export interface NewTask { title: string; description: string; instructions: string; dueDate: Date | null; priority: Task['priority']; assigneeId: string; routineId: string | null; checklistRunId: string | null; contactId: string | null }
export interface TaskMutation {
  actor: UserSummary | null; session: SessionSnapshot | null; target: Task | null;
  assignee: (id: string) => Promise<UserSummary | null>;
  routine: (id: string) => Promise<Routine | null>;
  contact: (id: string) => Promise<Contact | null>;
  run: (id: string) => Promise<ChecklistRun | null>;
  create: (input: NewTask) => Promise<Task>;
  update: (id: string, input: UpdateTask, fields: string[]) => Promise<Task>;
  assign: (task: Task, assigneeId: string) => Promise<Task>;
  status: (task: Task, status: Task['status']) => Promise<Task>;
}
export interface TasksRepository {
  find: (id: string) => Promise<Task | null>;
  list: (query: TaskListQuery, cursor: TaskCursor | null, today: string) => Promise<Task[]>;
  history: (id: string, query: TaskHistoryQuery) => Promise<TaskEvent[]>;
  withActor: <T>(actorId: string, sessionId: string, id: string | null, operation: (context: TaskMutation) => Promise<T>) => Promise<T>;
}
const userSelect = { id: true, name: true, email: true, role: true, isActive: true } satisfies Prisma.UserSelect;
const date = (value: string): Date => new Date(value + 'T00:00:00Z');
export function taskFilters(query: TaskListQuery, cursor: TaskCursor | null, today: string): Prisma.TaskWhereInput {
  const AND: Prisma.TaskWhereInput[] = [];
  if (query.dueFrom) AND.push({ dueDate: { gte: date(query.dueFrom) } });
  if (query.dueTo) AND.push({ dueDate: { lte: date(query.dueTo) } });
  const overdue: Prisma.TaskWhereInput = { status: { in: ['ABERTA', 'EM_ANDAMENTO'] }, dueDate: { lt: date(today) } };
  if (query.overdue !== undefined) AND.push(query.overdue ? overdue : { OR: [{ dueDate: null }, { dueDate: { gte: date(today) } }, { status: { in: ['CONCLUIDA', 'CANCELADA'] } }] });
  if (cursor) {
    const sameDate = cursor.dueDate ? date(cursor.dueDate) : null;
    const tail: Prisma.TaskWhereInput = { dueDate: sameDate, OR: [{ priorityRank: { lt: cursor.priorityRank } }, { priorityRank: cursor.priorityRank, id: { gt: cursor.id } }] };
    AND.push(cursor.dueDate ? { OR: [{ dueDate: { gt: date(cursor.dueDate) } }, { dueDate: null }, tail] } : tail);
  }
  return { AND, ...(query.status ? { status: query.status } : {}), ...(query.priority ? { priority: query.priority } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}), ...(query.routineId ? { routineId: query.routineId } : {}),
    ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {}) };
}
export const tasksRepository: TasksRepository = {
  find: (id) => prisma.task.findUnique({ where: { id } }),
  list: (query, cursor, today) => prisma.task.findMany({ where: taskFilters(query, cursor, today), orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priorityRank: 'desc' }, { id: 'asc' }], take: query.limit + 1 }),
  history: (taskId, query) => prisma.taskEvent.findMany({ where: { taskId, ...(query.cursor ? { id: { gt: query.cursor } } : {}) }, orderBy: { id: 'asc' }, take: query.limit + 1 }),
  withActor(actorId, sessionId, id, operation) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "role" = 'CHEFE' ORDER BY "id" FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${actorId} FOR UPDATE`;
      if (id) await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id" = ${id} FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: userSelect });
      const session = await tx.authSession.findUnique({ where: { id: sessionId }, select: { id: true, expiresAt: true, revokedAt: true, user: { select: userSelect } } });
      const target = id ? await tx.task.findUnique({ where: { id } }) : null;
      return operation({ actor, session, target,
        assignee: (userId) => tx.user.findUnique({ where: { id: userId }, select: userSelect }),
        async routine(routineId) { await tx.$queryRaw`SELECT "id" FROM "routines" WHERE "id" = ${routineId} FOR UPDATE`; return tx.routine.findUnique({ where: { id: routineId } }); },
        async contact(contactId) { await tx.$queryRaw`SELECT "id" FROM "contacts" WHERE "id" = ${contactId} FOR UPDATE`; return tx.contact.findUnique({ where: { id: contactId } }); },
        async run(runId) { await tx.$queryRaw`SELECT "id" FROM "checklist_runs" WHERE "id" = ${runId} FOR UPDATE`; return tx.checklistRun.findUnique({ where: { id: runId } }); },
        create: (input) => tx.task.create({ data: { ...input, priorityRank: taskPriorityRank(input.priority), createdById: actorId, updatedById: actorId,
          events: { create: { actorId, type: 'CREATED', toStatus: 'ABERTA', toAssigneeId: input.assigneeId } } } }),
        update: (taskId, input, changedFields) => tx.task.update({ where: { id: taskId }, data: {
          ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate === null ? null : date(input.dueDate) } : {}),
          ...(input.priority !== undefined ? { priority: input.priority, priorityRank: taskPriorityRank(input.priority) } : {}), updatedById: actorId,
          events: { create: { actorId, type: 'EDITED', changedFields } } } }),
        assign: (task, assigneeId) => tx.task.update({ where: { id: task.id }, data: { assigneeId, updatedById: actorId,
          events: { create: { actorId, type: 'REASSIGNED', fromAssigneeId: task.assigneeId, toAssigneeId: assigneeId } } } }),
        status: (task, status) => tx.task.update({ where: { id: task.id }, data: { status, updatedById: actorId,
          ...(status === 'EM_ANDAMENTO' ? { startedAt: new Date() } : {}),
          ...(status === 'CONCLUIDA' ? { completedAt: new Date(), completedById: actorId } : {}),
          ...(status === 'CANCELADA' ? { cancelledAt: new Date(), cancelledById: actorId } : {}),
          events: { create: { actorId, type: 'STATUS_CHANGED', fromStatus: task.status, toStatus: status } } } }),
      });
    });
  },
};
export async function seedDemoTasks(): Promise<void> {
  const chief = await prisma.user.findUniqueOrThrow({ where: { email: 'chefia@example.invalid' } });
  const member = await prisma.user.findUniqueOrThrow({ where: { email: 'assessor1@example.invalid' } });
  for (const [id, title] of [['demo-task-conferencia', 'Conferir expediente fictício'], ['demo-task-organizacao', 'Organizar pauta de demonstração']]) {
    if (!id || !title) throw new Error('Exemplo de tarefa inválido.');
    await prisma.task.upsert({ where: { id }, update: {}, create: { id, title, assigneeId: member.id, createdById: chief.id, updatedById: chief.id,
      events: { create: { actorId: chief.id, type: 'CREATED', toStatus: 'ABERTA', toAssigneeId: member.id } } } });
  }
}
