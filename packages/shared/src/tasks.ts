import { z } from 'zod';
import { checklistDateSchema } from './checklists.js';
const id = z.string().min(1).max(128);
export const taskStatusSchema = z.enum(['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']);
export const taskPrioritySchema = z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
const editable = { title: z.string().trim().min(1).max(200), description: z.string().trim().max(4000),
  instructions: z.string().trim().max(12000), dueDate: checklistDateSchema.nullable(), priority: taskPrioritySchema };
export const createTaskSchema = z.object({ ...editable, description: editable.description.default(''), instructions: editable.instructions.optional(),
  dueDate: editable.dueDate.default(null), priority: editable.priority.default('NORMAL'), assigneeId: id.optional(),
  routineId: id.nullable().default(null), checklistRunId: id.nullable().default(null), contactId: id.nullable().default(null) }).strict();
export type CreateTask = z.infer<typeof createTaskSchema>;
export const updateTaskSchema = z.object(editable).partial().strict().refine((value) => Object.values(value).some((field) => field !== undefined), 'Informe ao menos um campo.');
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export const assignTaskSchema = z.object({ assigneeId: id }).strict();
export const changeTaskStatusSchema = z.object({ status: taskStatusSchema }).strict();
export const taskSchema = z.object({ ...editable, id, assigneeId: id, routineId: id.nullable(), checklistRunId: id.nullable(), contactId: id.nullable(),
  createdById: id, updatedById: id, status: taskStatusSchema, isOverdue: z.boolean(), startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(), completedById: id.nullable(), cancelledAt: z.iso.datetime().nullable(), cancelledById: id.nullable(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export type Task = z.infer<typeof taskSchema>;
export const taskListQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/).optional(), status: taskStatusSchema.optional(), priority: taskPrioritySchema.optional(),
  assigneeId: id.optional(), routineId: id.optional(), q: z.string().trim().min(1).max(100).optional(),
  dueFrom: checklistDateSchema.optional(), dueTo: checklistDateSchema.optional(),
  overdue: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).strict().refine((value) => !value.dueFrom || !value.dueTo || value.dueFrom <= value.dueTo, 'Intervalo de prazo inválido.');
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export const taskPageSchema = z.object({ items: z.array(taskSchema).max(100), nextCursor: z.string().nullable() });
export type TaskPage = z.infer<typeof taskPageSchema>;
export const taskCursorSchema = z.object({ id, dueDate: checklistDateSchema.nullable(), priorityRank: z.number().int().min(0).max(3) }).strict();
export type TaskCursor = z.infer<typeof taskCursorSchema>;
export const taskHistoryQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: id.optional() }).strict();
export type TaskHistoryQuery = z.infer<typeof taskHistoryQuerySchema>;
export const taskEventSchema = z.object({ id, taskId: id, actorId: id, type: z.enum(['CREATED', 'EDITED', 'REASSIGNED', 'STATUS_CHANGED']),
  fromStatus: taskStatusSchema.nullable(), toStatus: taskStatusSchema.nullable(), fromAssigneeId: id.nullable(), toAssigneeId: id.nullable(),
  changedFields: z.array(z.string()).max(20), createdAt: z.iso.datetime() });
export const taskEventPageSchema = z.object({ items: z.array(taskEventSchema).max(100), nextCursor: z.string().nullable() });
export type TaskEventPage = z.infer<typeof taskEventPageSchema>;
const ranks: Record<TaskPriority, number> = { BAIXA: 0, NORMAL: 1, ALTA: 2, URGENTE: 3 };
export function taskPriorityRank(priority: TaskPriority): number { return ranks[priority]; }
