import { checklistRunSchema, checklistTemplateSchema, type ChecklistRun, type ChecklistTemplate } from '@gabinete-plus/shared';
export function templateFixture(input: Partial<ChecklistTemplate> = {}): ChecklistTemplate {
  return checklistTemplateSchema.parse({ id: 'template-1', routineId: 'routine-1', title: 'Checklist fictício', items: ['Conferir caixa'], version: 1, isArchived: false, createdById: 'actor', updatedById: 'actor', createdAt: '2026-10-12T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z', ...input });
}
export function runFixture(input: Partial<ChecklistRun> = {}): ChecklistRun {
  return checklistRunSchema.parse({ id: 'run-1', templateId: 'template-1', routineId: 'routine-1', assigneeId: 'actor', createdById: 'actor', titleSnapshot: 'Checklist fictício', routineTitleSnapshot: 'Rotina fictícia', instructionsSnapshot: 'Orientação preservada', frequencySnapshot: 'DIARIA', templateVersion: 1,
    periodKey: '2026-10-12', periodStart: '2026-10-12', periodEnd: '2026-10-13', status: 'POR_FAZER', totalItems: 1, completedItems: 0, progress: 0, items: [{ id: 'item-1', position: 0, text: 'Conferir caixa', isCompleted: false, completedById: null, completedAt: null }], completedAt: null, createdAt: '2026-10-12T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z', ...input });
}
