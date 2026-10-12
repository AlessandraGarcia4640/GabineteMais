import { z } from 'zod';
import { createTaskSchema, taskPrioritySchema, updateTaskSchema, type Task, type UserSummary, type CreateTask, type UpdateTask } from '@gabinete-plus/shared';
const fields = z.object({ title: z.string(), description: z.string(), instructions: z.string(), dueDate: z.string(), priority: taskPrioritySchema,
  assigneeId: z.string().min(1), routineId: z.string().nullable(), checklistRunId: z.string().nullable(), contactId: z.string().nullable() });
export type TaskFormValues = z.infer<typeof fields>;
export function civilDate(value: string): string | null {
  if (!value.trim()) return null; const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim()); return match ? `${String(match[3])}-${String(match[2])}-${String(match[1])}` : value;
}
export function initialTaskValues(actorId: string, task?: Task): TaskFormValues {
  return { title: task?.title ?? '', description: task?.description ?? '', instructions: task?.instructions ?? '', dueDate: task?.dueDate ? `${task.dueDate.slice(8, 10)}/${task.dueDate.slice(5, 7)}/${task.dueDate.slice(0, 4)}` : '', priority: task?.priority ?? 'NORMAL', assigneeId: task?.assigneeId ?? actorId,
    routineId: task?.routineId ?? null, checklistRunId: task?.checklistRunId ?? null, contactId: task?.contactId ?? null };
}
function payload(values: TaskFormValues) { return { ...values, dueDate: civilDate(values.dueDate) }; }
export const taskFormSchema = fields.superRefine((values, context) => {
  const result = createTaskSchema.safeParse(payload(values)); if (!result.success) for (const issue of result.error.issues) context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
});
export function taskPayload(values: TaskFormValues): CreateTask {
  const { instructions, ...rest } = payload(values); return createTaskSchema.parse({ ...rest, ...(instructions.trim() ? { instructions } : {}) });
}
export function taskChanges(original: Task, values: TaskFormValues): UpdateTask | null {
  const next = createTaskSchema.parse(payload(values)); const changes: UpdateTask = {};
  if (original.title !== next.title) changes.title = next.title;
  if (original.description !== next.description) changes.description = next.description;
  if (original.instructions !== next.instructions) changes.instructions = next.instructions;
  if (original.dueDate !== next.dueDate) changes.dueDate = next.dueDate;
  if (original.priority !== next.priority) changes.priority = next.priority;
  return Object.keys(changes).length ? updateTaskSchema.parse(changes) : null;
}
export function taskActions(task: Task, actor: UserSummary | null) {
  const open = task.status === 'ABERTA' || task.status === 'EM_ANDAMENTO'; const creator = !!actor && (actor.role === 'CHEFE' || actor.id === task.createdById); const owner = !!actor && (actor.role === 'CHEFE' || actor.id === task.assigneeId);
  return { edit: open && creator, assign: open && creator, cancel: open && creator, start: task.status === 'ABERTA' && owner, complete: task.status === 'EM_ANDAMENTO' && owner };
}
