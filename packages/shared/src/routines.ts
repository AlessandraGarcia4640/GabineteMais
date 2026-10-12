import { z } from 'zod';
import { userPositionSchema } from './users.js';

export const routineFrequencySchema = z.enum(['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'EVENTUAL', 'PERSONALIZADA', 'A_DEFINIR']);
const dateOnlySchema = z.iso.date().refine((value) => !value.startsWith('0000'), 'Data inválida.');
const fields = {
  title: z.string().trim().min(1).max(200), category: z.string().trim().min(1).max(100),
  frequency: routineFrequencySchema, description: z.string().trim().max(4000),
  instructions: z.string().trim().max(12000), steps: z.array(z.string().trim().min(1).max(500)).max(100),
  frequencyDetails: z.string().trim().min(1).max(2000).nullable(),
  specificDate: dateOnlySchema.nullable(), defaultPosition: userPositionSchema.nullable(),
  essentialForTransition: z.boolean(),
};
export const createRoutineSchema = z.object({ ...fields,
  description: fields.description.default(''), instructions: fields.instructions.default(''), steps: fields.steps.default([]),
  frequencyDetails: fields.frequencyDetails.default(null), specificDate: fields.specificDate.default(null),
  defaultPosition: fields.defaultPosition.default(null), essentialForTransition: fields.essentialForTransition.default(false),
}).strict().refine((value) => value.frequency !== 'PERSONALIZADA' || value.frequencyDetails !== null, {
  path: ['frequencyDetails'], message: 'Descreva a frequência personalizada.',
});
export type CreateRoutine = z.infer<typeof createRoutineSchema>;
export const updateRoutineSchema = z.object(fields).partial().strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), 'Informe ao menos um campo.');
export type UpdateRoutine = z.infer<typeof updateRoutineSchema>;
export const routineSchema = z.object({ ...fields, id: z.string().min(1), isArchived: z.boolean(),
  createdById: z.string().min(1), updatedById: z.string().min(1), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export type Routine = z.infer<typeof routineSchema>;
export const routineListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().min(1).max(128).optional(),
  isArchived: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  frequency: routineFrequencySchema.optional(), category: z.string().trim().min(1).max(100).optional(),
  defaultPosition: userPositionSchema.optional(), q: z.string().trim().min(1).max(100).optional(),
  scheduledFor: dateOnlySchema.optional(),
}).strict();
export type RoutineListQuery = z.infer<typeof routineListQuerySchema>;
export const routinePageSchema = z.object({ items: z.array(routineSchema).max(100), nextCursor: z.string().nullable() });
export type RoutinePage = z.infer<typeof routinePageSchema>;
