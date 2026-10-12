import { checklistDateSchema, taskPriorityRank, type Task } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { checklistPeriod } from '../checklists/period.js';
import { seedDemoUsers } from '../users/users.repository.js';
import { seedDemoRoutines } from '../routines/routines.repository.js';
import { seedDemoChecklists } from '../checklists/checklists.repository.js';
import { seedDemoContacts } from '../contacts/contacts.repository.js';
import { seedDemoTasks } from '../tasks/tasks.repository.js';
export const demoDateSchema = checklistDateSchema.refine((value) => value >= '2000-01-01' && value <= '2099-12-31', 'Use uma data de demonstração entre 2000 e 2099.');
export async function seedDemoDataset(passwordHash: string, referenceDate: string): Promise<void> {
  const day = demoDateSchema.parse(referenceDate);
  await seedDemoUsers(passwordHash); await seedDemoRoutines(); await seedDemoChecklists(); await seedDemoContacts(); await seedDemoTasks();
  await prisma.$transaction(async (tx) => {
    const [chief, member, support, routine, template, contact] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { email: 'chefia@example.invalid' } }), tx.user.findUniqueOrThrow({ where: { email: 'assessor1@example.invalid' } }), tx.user.findUniqueOrThrow({ where: { email: 'apoio@example.invalid' } }),
      tx.routine.findUniqueOrThrow({ where: { id: 'demo-routine-email' } }), tx.checklistTemplate.findUniqueOrThrow({ where: { id: 'demo-checklist-email' } }), tx.contact.findUniqueOrThrow({ where: { id: 'demo-contact-secretaria' } }),
    ]);
    if (!chief.isActive || chief.role !== 'CHEFE' || !member.isActive || !support.isActive || routine.isArchived || template.isArchived || contact.isArchived || !template.items.length) throw new Error('A demonstração foi alterada/inativada. Recrie em banco novo; registros existentes não serão reativados ou sobrescritos.');
    const yesterday = new Date(`${day}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1); const previous = yesterday.toISOString().slice(0, 10);
    const at = new Date(`${day}T09:00:00Z`); const started = new Date(at.getTime() + 3600000); const ended = new Date(at.getTime() + 7200000);
    const runIds = { current: 'demo-run-email-current', history: 'demo-run-email-history' };
    for (const sample of [{ id: runIds.current, day, complete: false }, { id: runIds.history, day: previous, complete: true }]) {
      const period = checklistPeriod(routine.frequency, sample.day); const count = sample.complete ? template.items.length : Math.min(1, template.items.length - 1); const markedAt = new Date(`${sample.day}T10:00:00Z`);
      const existing = await tx.checklistRun.findUnique({ where: { templateId_periodKey: { templateId: template.id, periodKey: period.key } } });
      if (existing && existing.id !== sample.id) throw new Error('Há execução de usuário no período da demonstração. Escolha banco novo ou outra data de referência.');
      await tx.checklistRun.upsert({ where: { id: sample.id }, update: {}, create: {
        id: sample.id, templateId: template.id, routineId: routine.id, assigneeId: member.id, createdById: chief.id, titleSnapshot: template.title, routineTitleSnapshot: routine.title, instructionsSnapshot: routine.instructions,
        frequencySnapshot: routine.frequency, templateVersion: template.version, periodKey: period.key, periodStart: period.start, periodEnd: period.end, totalItems: template.items.length, completedItems: count,
        status: sample.complete ? 'CONCLUIDA' : count ? 'EM_ANDAMENTO' : 'POR_FAZER', completedAt: sample.complete ? markedAt : null, createdAt: new Date(`${sample.day}T09:00:00Z`), updatedAt: markedAt,
        items: { create: template.items.map((text, position) => ({ id: `${sample.id}-item-${String(position)}`, text, position, isCompleted: position < count, completedById: position < count ? member.id : null, completedAt: position < count ? markedAt : null })) },
      } });
    }
    const samples: { id: string; title: string; status: Task['status']; priority: Task['priority']; owner: string; runId: string | null; dueDate: Date | null }[] = [
      { id: 'demo-task-linked-progress', title: 'Executar checklist fictício do gabinete', status: 'EM_ANDAMENTO', priority: 'ALTA', owner: member.id, runId: runIds.current, dueDate: new Date(`${day}T00:00:00Z`) },
      { id: 'demo-task-linked-done', title: 'Conferência fictícia concluída', status: 'CONCLUIDA', priority: 'NORMAL', owner: member.id, runId: runIds.history, dueDate: yesterday },
      { id: 'demo-task-overdue', title: 'Retorno fictício em atraso', status: 'ABERTA', priority: 'URGENTE', owner: support.id, runId: null, dueDate: yesterday },
      { id: 'demo-task-cancelled', title: 'Preparação fictícia cancelada', status: 'CANCELADA', priority: 'BAIXA', owner: member.id, runId: null, dueDate: null },
    ];
    for (const sample of samples) {
      const events: Prisma.TaskEventUncheckedCreateWithoutTaskInput[] = [{ id: `${sample.id}-event-00`, actorId: chief.id, type: 'CREATED', fromStatus: null, toStatus: 'ABERTA', toAssigneeId: sample.owner, createdAt: at }];
      const history: { id: string; actorId: string; type: 'STATUS_CHANGED'; fromStatus: Task['status']; toStatus: Task['status']; createdAt: Date }[] = [];
      if (sample.status === 'EM_ANDAMENTO' || sample.status === 'CONCLUIDA') history.push({ id: `${sample.id}-event-01`, actorId: sample.owner, type: 'STATUS_CHANGED', fromStatus: 'ABERTA', toStatus: 'EM_ANDAMENTO', createdAt: started });
      if (sample.status === 'CONCLUIDA' || sample.status === 'CANCELADA') history.push({ id: `${sample.id}-event-02`, actorId: sample.status === 'CANCELADA' ? chief.id : sample.owner, type: 'STATUS_CHANGED', fromStatus: sample.status === 'CANCELADA' ? 'ABERTA' : 'EM_ANDAMENTO', toStatus: sample.status, createdAt: ended });
      await tx.task.upsert({ where: { id: sample.id }, update: {}, create: { id: sample.id, title: sample.title, description: 'Cenário inteiramente fictício para demonstração.', instructions: routine.instructions, status: sample.status, priority: sample.priority, priorityRank: taskPriorityRank(sample.priority), assigneeId: sample.owner, createdById: chief.id, updatedById: chief.id,
        routineId: routine.id, contactId: contact.id, checklistRunId: sample.runId, dueDate: sample.dueDate, createdAt: at, updatedAt: sample.status === 'ABERTA' ? at : ended,
        startedAt: sample.status === 'EM_ANDAMENTO' || sample.status === 'CONCLUIDA' ? started : null, completedAt: sample.status === 'CONCLUIDA' ? ended : null, completedById: sample.status === 'CONCLUIDA' ? sample.owner : null,
        cancelledAt: sample.status === 'CANCELADA' ? ended : null, cancelledById: sample.status === 'CANCELADA' ? chief.id : null, events: { create: [...events, ...history] },
      } });
    }
  });
}
