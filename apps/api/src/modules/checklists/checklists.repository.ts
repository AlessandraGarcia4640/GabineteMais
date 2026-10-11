import type { ChecklistListQuery, ChecklistRunQuery, UpdateChecklist, UserSummary } from '@gabinete-plus/shared';
import type { Prisma, Routine } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { SessionSnapshot } from '../auth/session.repository.js';

const runInclude = { items: { orderBy: { position: 'asc' } } } satisfies Prisma.ChecklistRunInclude;
export type TemplateRecord = Prisma.ChecklistTemplateGetPayload<{ include: { routine: true } }>;
export type RunRecord = Prisma.ChecklistRunGetPayload<{ include: typeof runInclude }>;
export interface NewRun { templateId: string; routineId: string; assigneeId: string; createdById: string; titleSnapshot: string;
  routineTitleSnapshot: string; instructionsSnapshot: string; frequencySnapshot: Routine['frequency']; templateVersion: number;
  periodKey: string; periodStart: Date; periodEnd: Date; items: string[] }
export interface ChecklistScope { routineId?: string; templateId?: string; runId?: string }
export interface ChecklistMutation {
  actor: UserSummary | null; session: SessionSnapshot | null; routine: Routine | null;
  template: TemplateRecord | null; run: RunRecord | null;
  assignee: (id: string) => Promise<UserSummary | null>;
  existingRun: (templateId: string, periodKey: string) => Promise<RunRecord | null>;
  createTemplate: (routineId: string, title: string, items: string[]) => Promise<TemplateRecord>;
  updateTemplate: (id: string, input: UpdateChecklist) => Promise<TemplateRecord>;
  archiveTemplate: (id: string) => Promise<void>;
  createRun: (input: NewRun) => Promise<RunRecord>;
  mark: (runId: string, itemId: string, isCompleted: boolean, count: number, status: RunRecord['status'], at: Date) => Promise<RunRecord>;
}
export interface ChecklistsRepository {
  template: (id: string) => Promise<TemplateRecord | null>;
  run: (id: string) => Promise<RunRecord | null>;
  templates: (query: ChecklistListQuery) => Promise<TemplateRecord[]>;
  runs: (query: ChecklistRunQuery) => Promise<RunRecord[]>;
  withContext: <T>(actorId: string, sessionId: string, scope: ChecklistScope, operation: (context: ChecklistMutation) => Promise<T>) => Promise<T>;
}
const actorSelect = { id: true, name: true, email: true, role: true, isActive: true } satisfies Prisma.UserSelect;
export const checklistsRepository: ChecklistsRepository = {
  template: (id) => prisma.checklistTemplate.findUnique({ where: { id }, include: { routine: true } }),
  run: (id) => prisma.checklistRun.findUnique({ where: { id }, include: runInclude }),
  templates: (query) => prisma.checklistTemplate.findMany({ where: { isArchived: query.isArchived,
    ...(query.routineId ? { routineId: query.routineId } : {}), ...(query.cursor ? { id: { gt: query.cursor } } : {}) },
    orderBy: { id: 'asc' }, take: query.limit + 1, include: { routine: true } }),
  runs: (query) => prisma.checklistRun.findMany({ where: {
    ...(query.templateId ? { templateId: query.templateId } : {}), ...(query.routineId ? { routineId: query.routineId } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}), ...(query.status ? { status: query.status } : {}),
    ...(query.cursor ? { id: { gt: query.cursor } } : {}),
    ...(query.from ? { periodEnd: { gt: new Date(query.from + 'T00:00:00Z') } } : {}),
    ...(query.to ? { periodStart: { lte: new Date(query.to + 'T00:00:00Z') } } : {}),
  }, orderBy: { id: 'asc' }, take: query.limit + 1, include: runInclude }),
  withContext(actorId, sessionId, scope, operation) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "role" = 'CHEFE' ORDER BY "id" FOR UPDATE`;
      await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${actorId} FOR UPDATE`;
      const runReference = scope.runId ? await transaction.checklistRun.findUnique({ where: { id: scope.runId }, select: { templateId: true, routineId: true } }) : null;
      const templateId = scope.templateId ?? runReference?.templateId;
      const templateReference = templateId ? await transaction.checklistTemplate.findUnique({ where: { id: templateId }, select: { routineId: true } }) : null;
      const routineId = scope.routineId ?? runReference?.routineId ?? templateReference?.routineId;
      if (routineId) await transaction.$queryRaw`SELECT "id" FROM "routines" WHERE "id" = ${routineId} FOR UPDATE`;
      if (templateId) await transaction.$queryRaw`SELECT "id" FROM "checklist_templates" WHERE "id" = ${templateId} FOR UPDATE`;
      if (scope.runId) await transaction.$queryRaw`SELECT "id" FROM "checklist_runs" WHERE "id" = ${scope.runId} FOR UPDATE`;
      const actor = await transaction.user.findUnique({ where: { id: actorId }, select: actorSelect });
      const session = await transaction.authSession.findUnique({ where: { id: sessionId }, select: {
        id: true, expiresAt: true, revokedAt: true, user: { select: actorSelect },
      } });
      const routine = routineId ? await transaction.routine.findUnique({ where: { id: routineId } }) : null;
      const template = templateId ? await transaction.checklistTemplate.findUnique({ where: { id: templateId }, include: { routine: true } }) : null;
      const run = scope.runId ? await transaction.checklistRun.findUnique({ where: { id: scope.runId }, include: runInclude }) : null;
      return operation({ actor, session, routine, template, run,
        assignee: (id) => transaction.user.findUnique({ where: { id }, select: actorSelect }),
        existingRun: (id, periodKey) => transaction.checklistRun.findUnique({ where: { templateId_periodKey: { templateId: id, periodKey } }, include: runInclude }),
        createTemplate: (id, title, items) => transaction.checklistTemplate.create({ data: { routineId: id, title, items, createdById: actorId, updatedById: actorId }, include: { routine: true } }),
        updateTemplate: (id, input) => transaction.checklistTemplate.update({ where: { id }, data: {
          ...(input.title !== undefined ? { title: input.title } : {}), ...(input.items !== undefined ? { items: input.items } : {}),
          version: { increment: 1 }, updatedById: actorId,
        }, include: { routine: true } }),
        async archiveTemplate(id) { await transaction.checklistTemplate.update({ where: { id }, data: { isArchived: true, updatedById: actorId } }); },
        createRun(input) {
          const { items, ...fields } = input;
          return transaction.checklistRun.create({ data: { ...fields, totalItems: items.length,
            items: { create: items.map((text, position) => ({ text, position })) } }, include: runInclude });
        },
        async mark(runId, itemId, isCompleted, completedItems, status, at) {
          await transaction.checklistRunItem.update({ where: { id: itemId }, data: {
            isCompleted, completedById: isCompleted ? actorId : null, completedAt: isCompleted ? at : null,
          } });
          return transaction.checklistRun.update({ where: { id: runId }, data: {
            completedItems, status, completedAt: status === 'CONCLUIDA' ? at : null,
          }, include: runInclude });
        },
      });
    });
  },
};

export async function seedDemoChecklists(): Promise<void> {
  const routine = await prisma.routine.findUnique({ where: { id: 'demo-routine-email' } });
  if (!routine || routine.steps.length === 0) return;
  await prisma.checklistTemplate.upsert({ where: { id: 'demo-checklist-email' }, update: {}, create: {
    id: 'demo-checklist-email', routineId: routine.id, title: 'Checklist do e-mail do gabinete', items: routine.steps,
    createdById: routine.createdById, updatedById: routine.updatedById,
  } });
}
