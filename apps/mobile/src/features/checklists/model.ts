import { z } from 'zod';
import { createChecklistSchema, startChecklistSchema, updateChecklistSchema, type ChecklistRun, type ChecklistTemplate, type CreateChecklist, type UpdateChecklist } from '@gabinete-plus/shared';
const fields = z.object({ routineId: z.string(), title: z.string(), items: z.array(z.object({ text: z.string() })) });
export type ChecklistFormValues = z.infer<typeof fields>;
export function templatePayload(values: ChecklistFormValues): CreateChecklist { return createChecklistSchema.parse({ ...values, items: values.items.map((item) => item.text) }); }
export const templateFormSchema = fields.superRefine((values, context) => {
  const result = createChecklistSchema.safeParse({ ...values, items: values.items.map((item) => item.text) });
  if (!result.success) for (const issue of result.error.issues) context.addIssue({ code: 'custom', path: issue.path[0] === 'items' && typeof issue.path[1] === 'number' ? ['items', issue.path[1], 'text'] : issue.path, message: issue.message });
});
export function templateChanges(original: ChecklistTemplate, next: CreateChecklist): UpdateChecklist | null {
  const changes: UpdateChecklist = {};
  if (original.title !== next.title) changes.title = next.title;
  if (JSON.stringify(original.items) !== JSON.stringify(next.items)) changes.items = next.items;
  return Object.keys(changes).length ? updateChecklistSchema.parse(changes) : null;
}
export function dateInput(day: string): string { return `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`; }
export function startPayload(date: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  return startChecklistSchema.parse({ date: match ? `${String(match[3])}-${String(match[2])}-${String(match[1])}` : date });
}
export const startFormSchema = z.object({ date: z.string() }).superRefine((value, context) => {
  try { startPayload(value.date); } catch { context.addIssue({ code: 'custom', path: ['date'], message: 'Data inválida.' }); }
});
export function optimisticMark(run: ChecklistRun, itemId: string, isCompleted: boolean, actorId: string, now = new Date().toISOString()): ChecklistRun {
  const items = run.items.map((item) => item.id === itemId && item.isCompleted !== isCompleted ? { ...item, isCompleted, completedById: isCompleted ? actorId : null, completedAt: isCompleted ? now : null } : item);
  const completedItems = items.filter((item) => item.isCompleted).length;
  return { ...run, items, completedItems, progress: Math.round(completedItems * 100 / run.totalItems), status: completedItems === run.totalItems ? 'CONCLUIDA' : completedItems ? 'EM_ANDAMENTO' : 'POR_FAZER', completedAt: completedItems === run.totalItems ? now : null };
}
