import type { UserSummary, UpdateTransition, TransitionQuery, TransitionSnapshotsQuery } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';
import type { Prisma, Routine, Contact, Task, TransitionSettings, TransitionSnapshot } from '../../generated/prisma/client.js';
import { guidelineInclude, type StoredGuideline } from '../guidelines/guidelines.repository.js';
import type { SessionSnapshot } from '../auth/session.repository.js';
export interface GuideRows { settings: TransitionSettings | null; routines: Routine[]; guidelines: StoredGuideline[]; contacts: Contact[]; tasks: (Task & { assignee: { name: string } })[] }
async function collect(tx: Prisma.TransactionClient, query?: TransitionQuery): Promise<GuideRows> {
  const take = query ? query.limit + 1 : 101; const after = query?.cursor ? { id: { gt: query.cursor } } : {};
  const orderBy = { id: 'asc' } satisfies Prisma.RoutineOrderByWithRelationInput;
  const selected = (section: TransitionQuery['section']) => !query || query.section === section;
  return { settings: await tx.transitionSettings.findUnique({ where: { id: 'gabinete' } }),
    routines: selected('ROUTINES') ? await tx.routine.findMany({ where: { isArchived: false, essentialForTransition: true, ...after }, orderBy, take }) : [],
    guidelines: selected('GUIDELINES') ? await tx.guideline.findMany({ where: { isArchived: false, essentialForTransition: true, ...after }, orderBy, take, include: guidelineInclude }) : [],
    contacts: selected('CONTACTS') ? await tx.contact.findMany({ where: { isArchived: false, isKeyContact: true, ...after }, orderBy, take }) : [],
    tasks: selected('TASKS') ? await tx.task.findMany({ where: { status: { in: ['ABERTA', 'EM_ANDAMENTO'] }, ...after }, orderBy, take, include: { assignee: { select: { name: true } } } }) : [],
  };
}
export interface TransitionMutation { actor: UserSummary | null; session: SessionSnapshot | null; settings: TransitionSettings; collect: () => Promise<GuideRows>; update: (input: UpdateTransition) => Promise<TransitionSettings>; snapshot: (title: string, content: Prisma.InputJsonObject) => Promise<TransitionSnapshot> }
export const transitionRepository = {
  read: (query: TransitionQuery) => prisma.$transaction((tx) => collect(tx, query), { isolationLevel: 'RepeatableRead' }),
  list: (query: TransitionSnapshotsQuery) => prisma.transitionSnapshot.findMany({ where: query.cursor ? { version: { lt: query.cursor } } : {}, orderBy: { version: 'desc' }, take: query.limit + 1, omit: { content: true } }),
  find: (id: string) => prisma.transitionSnapshot.findUnique({ where: { id } }),
  withActor<T>(actorId: string, sessionId: string, operation: (context: TransitionMutation) => Promise<T>): Promise<T> { return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE role = 'CHEFE' ORDER BY id FOR UPDATE`; await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR UPDATE`;
    await tx.transitionSettings.upsert({ where: { id: 'gabinete' }, update: {}, create: { id: 'gabinete' } });
    await tx.$queryRaw`SELECT id FROM transition_settings WHERE id = 'gabinete' FOR UPDATE`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, name: true, email: true, role: true, isActive: true } });
    const session = await tx.authSession.findUnique({ where: { id: sessionId }, include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } } });
    const settings = await tx.transitionSettings.findUniqueOrThrow({ where: { id: 'gabinete' } });
    return operation({ actor, session, settings, collect: () => collect(tx), update: (input) => tx.transitionSettings.update({ where: { id: 'gabinete' }, data: { overview: input.overview, notes: input.notes, revision: { increment: 1 }, updatedById: actorId } }),
      async snapshot(title, content) { await tx.transitionSettings.update({ where: { id: 'gabinete' }, data: { revision: { increment: 1 }, updatedById: actorId } }); const latest = await tx.transitionSnapshot.aggregate({ _max: { version: true } }); return tx.transitionSnapshot.create({ data: { title, version: (latest._max.version ?? 0) + 1, authorId: actorId, authorName: actor?.name ?? '', content } }); },
    });
  }, { isolationLevel: 'RepeatableRead' }); },
};
export type TransitionRepository = typeof transitionRepository;
export async function seedDemoTransition() {
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: 'chefia@example.invalid' } });
  await prisma.transitionSettings.upsert({ where: { id: 'gabinete' }, update: {}, create: { id: 'gabinete', overview: '# Gabinete fictício\n\nDemonstração de continuidade administrativa com dados fictícios.', notes: 'Conferir pendências e orientações antes da substituição.', updatedById: actor.id } });
}
