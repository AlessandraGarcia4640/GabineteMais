import { expect, it, vi } from 'vitest';
import { createRoutineSchema, type UserRole } from '@gabinete-plus/shared';
import { AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { ChecklistsService } from './checklists.service.js';
import type { ChecklistMutation, ChecklistsRepository, NewRun, RunRecord, TemplateRecord } from './checklists.repository.js';

function fixture(role: UserRole = 'ASSESSOR') {
  const user = { id: 'actor', name: 'Pessoa Fictícia', email: 'actor@example.invalid', role, isActive: true };
  const principal: SessionPrincipal = { user, sessionId: 'session', expiresAt: new Date(Date.now() + 86400000) };
  const routine = { ...createRoutineSchema.parse({ title: 'Atividade', category: 'Administrativo', frequency: 'DIARIA', steps: ['Item A', 'Item B'] }),
    id: 'routine', specificDate: null, isArchived: false, createdById: user.id, updatedById: user.id, createdAt: new Date(), updatedAt: new Date() };
  const template: TemplateRecord = { id: 'template', routineId: routine.id, routine, title: 'Modelo', items: ['Item A', 'Item B'], version: 1,
    isArchived: false, createdById: user.id, updatedById: user.id, createdAt: new Date(), updatedAt: new Date() };
  const run: RunRecord = { id: 'run', templateId: template.id, routineId: routine.id, assigneeId: user.id, createdById: user.id,
    titleSnapshot: template.title, routineTitleSnapshot: routine.title, instructionsSnapshot: routine.instructions, frequencySnapshot: 'DIARIA',
    templateVersion: 1, periodKey: 'DIARIA:2026-10-11', periodStart: new Date('2026-10-11T00:00:00Z'), periodEnd: new Date('2026-10-12T00:00:00Z'),
    status: 'POR_FAZER', totalItems: 2, completedItems: 0, completedAt: null, createdAt: new Date(), updatedAt: new Date(),
    items: ['Item A', 'Item B'].map((text, position) => ({ id: `item-${String(position)}`, runId: 'run', text, position, isCompleted: false, completedById: null, completedAt: null })) };
  const existingRun = vi.fn((): Promise<RunRecord | null> => Promise.resolve(null));
  const createRun = vi.fn((input: NewRun) => Promise.resolve({ ...run, titleSnapshot: input.titleSnapshot, templateVersion: input.templateVersion }));
  const mark = vi.fn((_runId: string, itemId: string, isCompleted: boolean, count: number, status: RunRecord['status'], at: Date) => {
    const item = run.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Item ausente.');
    item.isCompleted = isCompleted; item.completedById = isCompleted ? user.id : null; item.completedAt = isCompleted ? at : null;
    run.completedItems = count; run.status = status; run.completedAt = status === 'CONCLUIDA' ? at : null;
    return Promise.resolve(run);
  });
  const context: ChecklistMutation = { actor: user, session: { id: principal.sessionId, user, expiresAt: principal.expiresAt, revokedAt: null },
    routine, template, run, existingRun, createRun, mark,
    assignee: (id) => Promise.resolve({ ...user, id }),
    createTemplate: () => Promise.resolve(template), updateTemplate: () => Promise.resolve(template), archiveTemplate: () => Promise.resolve(),
  };
  const repository: ChecklistsRepository = { template: () => Promise.resolve(template), run: () => Promise.resolve(run),
    templates: () => Promise.resolve([template]), runs: () => Promise.resolve([run]),
    withContext(_actor, _session, _scope, operation) { return operation(context); } };
  const authorization = new AuthorizationService({ verifyToken: () => Promise.resolve(null), findSession: () => Promise.resolve(null) });
  return { service: new ChecklistsService(authorization, repository), principal, context, template, run, existingRun, createRun, mark };
}
it('não permite gerir modelos a assessor mesmo sem middleware', async () => {
  const { service, principal } = fixture();
  await expect(service.create(principal, { routineId: 'routine', title: 'Modelo' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
it('responsável marca; outro assessor não marca nem atribui a terceiros', async () => {
  const { service, principal, run, mark } = fixture();
  run.assigneeId = 'other';
  await expect(service.mark(principal, run.id, 'item-0', true)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(service.start(principal, 'template', { date: '2026-10-11', assigneeId: 'other' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(mark).not.toHaveBeenCalled();
});
it('reutiliza execução do período sem recriar snapshot', async () => {
  const { service, principal, existingRun, run, createRun } = fixture();
  existingRun.mockResolvedValue(run);
  expect((await service.start(principal, 'template', { date: '2026-10-11' })).created).toBe(false);
  expect(createRun).not.toHaveBeenCalled();
});
it('snapshot de itens não compartilha array do modelo', async () => {
  const { service, principal, template, createRun } = fixture();
  await service.start(principal, 'template', { date: '2026-10-11' });
  template.items[0] = 'Texto alterado';
  expect(createRun.mock.calls[0]?.[0].items[0]).toBe('Item A');
});
it('marcação repetida conserva autoria/horário e não incrementa contador', async () => {
  const { service, principal, run, mark } = fixture();
  const item = run.items[0]; if (!item) throw new Error('Item ausente.');
  item.isCompleted = true; item.completedById = principal.user.id; item.completedAt = new Date();
  run.completedItems = 1; run.status = 'EM_ANDAMENTO';
  const result = await service.mark(principal, run.id, item.id, true);
  expect(result.progress).toBe(50); expect(mark).not.toHaveBeenCalled();
});
it('arquivo impede novas execuções mas permite concluir pendência antiga', async () => {
  const { service, principal, template, run, mark } = fixture('CHEFE'); template.isArchived = true;
  await expect(service.start(principal, template.id, { date: '2026-10-12' })).rejects.toMatchObject({ code: 'CHECKLIST_TEMPLATE_ARCHIVED' });
  await service.mark(principal, run.id, 'item-0', true); expect(mark).toHaveBeenCalledTimes(1);
});
it('revalida ativação e recusa item de outra execução', async () => {
  const { service, principal, context, run, mark } = fixture();
  await expect(service.mark(principal, run.id, 'other-item', true)).rejects.toMatchObject({ code: 'CHECKLIST_ITEM_NOT_FOUND' });
  context.session = null;
  await expect(service.mark(principal, run.id, 'item-0', true)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(mark).not.toHaveBeenCalled();
});
it('calcula conclusão e reabertura ao marcar/desmarcar itens', async () => {
  const { service, principal, run } = fixture();
  await service.mark(principal, run.id, 'item-0', true);
  const complete = await service.mark(principal, run.id, 'item-1', true);
  expect(complete.progress).toBe(100); expect(complete.status).toBe('CONCLUIDA'); expect(complete.completedAt).not.toBeNull();
  const reopened = await service.mark(principal, run.id, 'item-0', false);
  expect(reopened.progress).toBe(50); expect(reopened.status).toBe('EM_ANDAMENTO'); expect(reopened.completedAt).toBeNull();
  expect(reopened.items[0]?.completedById).toBeNull();
});
