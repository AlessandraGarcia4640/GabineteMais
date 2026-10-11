import { z } from 'zod';
import { routineFrequencySchema } from './routines.js';

const id = z.string().min(1).max(128);
export const checklistDateSchema = z.iso.date().refine((value) => Number(value.slice(0, 4)) >= 1 && Number(value.slice(0, 4)) <= 9998, 'Data fora do intervalo suportado.');
const items = z.array(z.string().trim().min(1).max(500)).min(1).max(100);
export const createChecklistSchema = z.object({ routineId: id, title: z.string().trim().min(1).max(200), items: items.optional() }).strict();
export type CreateChecklist = z.infer<typeof createChecklistSchema>;
export const updateChecklistSchema = z.object({ title: z.string().trim().min(1).max(200).optional(), items: items.optional() }).strict()
  .refine((value) => value.title !== undefined || value.items !== undefined, 'Informe título ou itens.');
export type UpdateChecklist = z.infer<typeof updateChecklistSchema>;
export const startChecklistSchema = z.object({ date: checklistDateSchema.optional(), assigneeId: id.optional() }).strict();
export type StartChecklist = z.infer<typeof startChecklistSchema>;
export const markChecklistItemSchema = z.object({ isCompleted: z.boolean() }).strict();
export const checklistStatusSchema = z.enum(['POR_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA']);
export const checklistTemplateSchema = z.object({
  id, routineId: id, title: z.string(), items, version: z.number().int().positive(), isArchived: z.boolean(),
  createdById: id, updatedById: id, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export type ChecklistTemplate = z.infer<typeof checklistTemplateSchema>;
export const checklistItemSchema = z.object({ id, position: z.number().int().nonnegative(), text: z.string(),
  isCompleted: z.boolean(), completedById: id.nullable(), completedAt: z.iso.datetime().nullable() });
export const checklistRunSchema = z.object({
  id, templateId: id, routineId: id, assigneeId: id, createdById: id,
  titleSnapshot: z.string(), routineTitleSnapshot: z.string(), instructionsSnapshot: z.string(),
  frequencySnapshot: routineFrequencySchema, templateVersion: z.number().int().positive(),
  periodKey: z.string(), periodStart: checklistDateSchema, periodEnd: z.iso.date(),
  status: checklistStatusSchema, totalItems: z.number().int().min(1).max(100), completedItems: z.number().int().min(0).max(100),
  progress: z.number().int().min(0).max(100), items: z.array(checklistItemSchema).max(100),
  completedAt: z.iso.datetime().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export type ChecklistRun = z.infer<typeof checklistRunSchema>;
const paging = { limit: z.coerce.number().int().min(1).max(100).default(20), cursor: id.optional() };
export const checklistListQuerySchema = z.object({ ...paging, routineId: id.optional(), isArchived: z.enum(['true', 'false']).default('false').transform((value) => value === 'true') }).strict();
export type ChecklistListQuery = z.infer<typeof checklistListQuerySchema>;
export const checklistRunQuerySchema = z.object({ ...paging, templateId: id.optional(), routineId: id.optional(),
  assigneeId: id.optional(), status: checklistStatusSchema.optional(), from: checklistDateSchema.optional(), to: checklistDateSchema.optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, 'O início deve ser anterior ao fim.');
export type ChecklistRunQuery = z.infer<typeof checklistRunQuerySchema>;
export const checklistTemplatePageSchema = z.object({ items: z.array(checklistTemplateSchema).max(100), nextCursor: z.string().nullable() });
export const checklistRunPageSchema = z.object({ items: z.array(checklistRunSchema).max(100), nextCursor: z.string().nullable() });
export type ChecklistTemplatePage = z.infer<typeof checklistTemplatePageSchema>;
export type ChecklistRunPage = z.infer<typeof checklistRunPageSchema>;
export const checklistItemParamsSchema = z.object({ id, itemId: id });
