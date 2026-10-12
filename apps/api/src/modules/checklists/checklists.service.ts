import { checklistDateSchema, checklistRunPageSchema, checklistRunSchema, checklistTemplatePageSchema, checklistTemplateSchema, createChecklistSchema,
  type ChecklistListQuery, type ChecklistRun, type ChecklistRunPage, type ChecklistRunQuery, type ChecklistTemplate, type ChecklistTemplatePage,
  type CreateChecklist, type Permission, type StartChecklist, type UpdateChecklist } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import type { ChecklistMutation, ChecklistsRepository, RunRecord, TemplateRecord } from './checklists.repository.js';
import { checklistPeriod, todayInGabinete } from './period.js';

function templateView(row: TemplateRecord): ChecklistTemplate {
  return checklistTemplateSchema.parse({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
function runView(row: RunRecord): ChecklistRun {
  return checklistRunSchema.parse({ ...row, periodStart: row.periodStart.toISOString().slice(0, 10), periodEnd: row.periodEnd.toISOString().slice(0, 10),
    progress: Math.round(row.completedItems * 100 / row.totalItems), completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({ ...item, completedAt: item.completedAt?.toISOString() ?? null })) });
}
function missing(kind: 'TEMPLATE' | 'RUN' | 'ITEM'): AppError {
  return new AppError(`CHECKLIST_${kind}_NOT_FOUND`, 'Registro de checklist não encontrado.', 404);
}
function forbidden(): AppError { return new AppError('FORBIDDEN', 'Você não tem permissão para esta operação.', 403); }

export class ChecklistsService {
  constructor(private readonly authorization: AuthorizationService, private readonly repository: ChecklistsRepository) {}
  private authorize(principal: SessionPrincipal, context: ChecklistMutation, permission: Permission): SessionPrincipal {
    if (!context.actor || !context.session) throw unauthenticated();
    if (context.actor.id !== principal.user.id || context.session.id !== principal.sessionId || context.session.user.id !== principal.user.id
      || context.session.revokedAt || context.session.expiresAt <= new Date()) throw unauthenticated();
    const live = { ...principal, user: context.actor, expiresAt: context.session.expiresAt };
    this.authorization.requirePermission(live, permission);
    return live;
  }
  async templates(principal: SessionPrincipal, query: ChecklistListQuery): Promise<ChecklistTemplatePage> {
    this.authorization.requirePermission(principal, 'checklists:read');
    const rows = await this.repository.templates(query); const visible = rows.slice(0, query.limit);
    return checklistTemplatePageSchema.parse({ items: visible.map(templateView), nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }
  async template(principal: SessionPrincipal, id: string): Promise<ChecklistTemplate> {
    this.authorization.requirePermission(principal, 'checklists:read');
    const row = await this.repository.template(id); if (!row) throw missing('TEMPLATE'); return templateView(row);
  }
  async create(principal: SessionPrincipal, input: CreateChecklist): Promise<ChecklistTemplate> {
    this.authorization.requirePermission(principal, 'checklists:manage');
    return this.repository.withContext(principal.user.id, principal.sessionId, { routineId: input.routineId }, async (context) => {
      this.authorize(principal, context, 'checklists:manage');
      if (!context.routine) throw new AppError('ROUTINE_NOT_FOUND', 'Atividade não encontrada.', 404);
      if (context.routine.isArchived) throw new AppError('ROUTINE_ARCHIVED', 'Atividade arquivada não recebe novos modelos.', 409);
      const items = input.items ?? context.routine.steps;
      if (items.length === 0) throw new AppError('CHECKLIST_EMPTY', 'Informe ao menos um item.', 400);
      const validated = createChecklistSchema.parse({ ...input, items });
      return templateView(await context.createTemplate(input.routineId, validated.title, validated.items ?? items));
    });
  }
  async update(principal: SessionPrincipal, id: string, input: UpdateChecklist): Promise<ChecklistTemplate> {
    this.authorization.requirePermission(principal, 'checklists:manage');
    return this.repository.withContext(principal.user.id, principal.sessionId, { templateId: id }, async (context) => {
      this.authorize(principal, context, 'checklists:manage');
      if (!context.template) throw missing('TEMPLATE');
      if (context.template.isArchived) throw new AppError('CHECKLIST_TEMPLATE_ARCHIVED', 'Modelo arquivado não pode ser editado.', 409);
      if (context.template.routine.isArchived) throw new AppError('ROUTINE_ARCHIVED', 'Atividade arquivada não permite editar modelos.', 409);
      return templateView(await context.updateTemplate(id, input));
    });
  }
  async archive(principal: SessionPrincipal, id: string): Promise<void> {
    this.authorization.requirePermission(principal, 'checklists:manage');
    await this.repository.withContext(principal.user.id, principal.sessionId, { templateId: id }, async (context) => {
      this.authorize(principal, context, 'checklists:manage');
      if (!context.template) throw missing('TEMPLATE');
      if (!context.template.isArchived) await context.archiveTemplate(id);
    });
  }
  async runs(principal: SessionPrincipal, query: ChecklistRunQuery): Promise<ChecklistRunPage> {
    this.authorization.requirePermission(principal, 'checklists:read');
    const rows = await this.repository.runs(query); const visible = rows.slice(0, query.limit);
    return checklistRunPageSchema.parse({ items: visible.map(runView), nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }
  async run(principal: SessionPrincipal, id: string): Promise<ChecklistRun> {
    this.authorization.requirePermission(principal, 'checklists:read');
    const row = await this.repository.run(id); if (!row) throw missing('RUN'); return runView(row);
  }
  async start(principal: SessionPrincipal, id: string, input: StartChecklist): Promise<{ run: ChecklistRun; created: boolean }> {
    this.authorization.requirePermission(principal, 'checklists:execute-assigned');
    return this.repository.withContext(principal.user.id, principal.sessionId, { templateId: id }, async (context) => {
      const live = this.authorize(principal, context, 'checklists:execute-assigned');
      const template = context.template;
      if (!template) throw missing('TEMPLATE');
      if (template.isArchived) throw new AppError('CHECKLIST_TEMPLATE_ARCHIVED', 'Modelo arquivado não gera novas execuções.', 409);
      if (template.routine.isArchived) throw new AppError('ROUTINE_ARCHIVED', 'Atividade arquivada não gera novas execuções.', 409);
      const assigneeId = input.assigneeId ?? live.user.id;
      if (assigneeId !== live.user.id && live.user.role !== 'CHEFE') throw forbidden();
      const assignee = await context.assignee(assigneeId);
      if (!assignee?.isActive) throw new AppError('CHECKLIST_ASSIGNEE_INACTIVE', 'Escolha um responsável ativo.', 409);
      const date = checklistDateSchema.parse(input.date ?? template.routine.specificDate?.toISOString().slice(0, 10) ?? todayInGabinete());
      const period = checklistPeriod(template.routine.frequency, date);
      const existing = await context.existingRun(id, period.key);
      if (existing) {
        if (existing.assigneeId !== assigneeId) {
          if (live.user.role !== 'CHEFE') throw forbidden();
          throw new AppError('CHECKLIST_RUN_EXISTS', 'O período já possui execução com outro responsável.', 409);
        }
        return { run: runView(existing), created: false };
      }
      const created = await context.createRun({ templateId: id, routineId: template.routineId, assigneeId, createdById: live.user.id,
        titleSnapshot: template.title, routineTitleSnapshot: template.routine.title, instructionsSnapshot: template.routine.instructions,
        frequencySnapshot: template.routine.frequency, templateVersion: template.version, periodKey: period.key,
        periodStart: period.start, periodEnd: period.end, items: [...template.items] });
      return { run: runView(created), created: true };
    });
  }
  async mark(principal: SessionPrincipal, id: string, itemId: string, isCompleted: boolean): Promise<ChecklistRun> {
    this.authorization.requirePermission(principal, 'checklists:execute-assigned');
    return this.repository.withContext(principal.user.id, principal.sessionId, { runId: id }, async (context) => {
      const live = this.authorize(principal, context, 'checklists:execute-assigned');
      const run = context.run; if (!run) throw missing('RUN');
      if (run.assigneeId !== live.user.id && live.user.role !== 'CHEFE') throw forbidden();
      const item = run.items.find((entry) => entry.id === itemId); if (!item) throw missing('ITEM');
      if (item.isCompleted === isCompleted) return runView(run);
      if (!isCompleted && await context.hasCompletedTask()) throw new AppError('CHECKLIST_TASK_COMPLETED', 'Checklist vinculado a tarefa concluída não pode ser reaberto.', 409);
      const count = run.completedItems + (isCompleted ? 1 : -1);
      const status = count === run.totalItems ? 'CONCLUIDA' : count === 0 ? 'POR_FAZER' : 'EM_ANDAMENTO';
      return runView(await context.mark(id, itemId, isCompleted, count, status, new Date()));
    });
  }
}
