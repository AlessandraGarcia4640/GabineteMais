import { createRoutineSchema, routineFrequencySchema, updateRoutineSchema, userPositionSchema, type CreateRoutine, type Routine, type UpdateRoutine } from '@gabinete-plus/shared';
import { z } from 'zod';
const fields = z.object({ title: z.string(), category: z.string(), frequency: routineFrequencySchema,
  description: z.string(), instructions: z.string(), steps: z.array(z.object({ text: z.string() })),
  frequencyDetails: z.string(), specificDate: z.string(), defaultPosition: z.union([userPositionSchema, z.literal('')]), essentialForTransition: z.boolean() });
export type RoutineFormValues = z.infer<typeof fields>;
function datePayload(value: string): string | null {
  if (!value.trim()) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  return match ? `${String(match[3])}-${String(match[2])}-${String(match[1])}` : value;
}
function payload(values: RoutineFormValues) {
  return { ...values, steps: values.steps.map((step) => step.text), specificDate: datePayload(values.specificDate),
    frequencyDetails: values.frequencyDetails.trim() || null, defaultPosition: values.defaultPosition || null };
}
export const routineFormSchema = fields.superRefine((values, context) => {
  const validated = createRoutineSchema.safeParse(payload(values));
  if (!validated.success) for (const issue of validated.error.issues) {
    const path = issue.path[0] === 'steps' && typeof issue.path[1] === 'number' ? ['steps', issue.path[1], 'text'] : issue.path;
    context.addIssue({ code: 'custom', path, message: issue.message });
  }
});
export function toRoutinePayload(values: RoutineFormValues): CreateRoutine { return createRoutineSchema.parse(payload(values)); }
export function initialValues(routine?: Routine): RoutineFormValues {
  return { title: routine?.title ?? '', category: routine?.category ?? '', frequency: routine?.frequency ?? 'DIARIA', description: routine?.description ?? '', instructions: routine?.instructions ?? '',
    steps: routine?.steps.map((text) => ({ text })) ?? [], frequencyDetails: routine?.frequencyDetails ?? '',
    specificDate: routine?.specificDate ? `${routine.specificDate.slice(8, 10)}/${routine.specificDate.slice(5, 7)}/${routine.specificDate.slice(0, 4)}` : '',
    defaultPosition: routine?.defaultPosition ?? '', essentialForTransition: routine?.essentialForTransition ?? false };
}
export function routineChanges(original: Routine, next: CreateRoutine): UpdateRoutine | null {
  const changes: UpdateRoutine = {};
  if (original.title !== next.title) changes.title = next.title;
  if (original.category !== next.category) changes.category = next.category;
  if (original.frequency !== next.frequency) changes.frequency = next.frequency;
  if (original.description !== next.description) changes.description = next.description;
  if (original.instructions !== next.instructions) changes.instructions = next.instructions;
  if (JSON.stringify(original.steps) !== JSON.stringify(next.steps)) changes.steps = next.steps;
  if (original.frequencyDetails !== next.frequencyDetails) changes.frequencyDetails = next.frequencyDetails;
  if (original.specificDate !== next.specificDate) changes.specificDate = next.specificDate;
  if (original.defaultPosition !== next.defaultPosition) changes.defaultPosition = next.defaultPosition;
  if (original.essentialForTransition !== next.essentialForTransition) changes.essentialForTransition = next.essentialForTransition;
  return Object.keys(changes).length ? updateRoutineSchema.parse(changes) : null;
}
