import type { CreateGuideline, GuidelineListQuery, GuidelineHistoryQuery, UserSummary } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';
import type { Prisma, Guideline, GuidelineVersion } from '../../generated/prisma/client.js';
import type { SessionSnapshot } from '../auth/session.repository.js';
export const guidelineInclude = { versions: { orderBy: { version: 'desc' }, take: 1 } } satisfies Prisma.GuidelineInclude;
export type StoredGuideline = Prisma.GuidelineGetPayload<{ include: typeof guidelineInclude }>;
export interface GuidelineMutation { actor: UserSummary | null; session: SessionSnapshot | null; target: StoredGuideline | null; create: (input: CreateGuideline) => Promise<StoredGuideline>; update: (id: string, input: CreateGuideline, version: number) => Promise<StoredGuideline>; archive: (id: string) => Promise<void> }
export interface GuidelinesRepository { list: (query: GuidelineListQuery) => Promise<StoredGuideline[]>; find: (id: string) => Promise<StoredGuideline | null>; history: (id: string, query: GuidelineHistoryQuery) => Promise<GuidelineVersion[]>; version: (id: string, version: number) => Promise<GuidelineVersion | null>; withActor: <T>(actorId: string, sessionId: string, id: string | null, operation: (context: GuidelineMutation) => Promise<T>) => Promise<T> }
export function guidelineWhere(query: GuidelineListQuery): Prisma.GuidelineWhereInput { return { isArchived: query.isArchived, ...(query.cursor ? { id: { gt: query.cursor } } : {}), ...(query.category ? { category: query.category } : {}), ...(query.essentialForTransition !== undefined ? { essentialForTransition: query.essentialForTransition } : {}), ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { content: { contains: query.q, mode: 'insensitive' } }] } : {}) }; }
export const guidelinesRepository: GuidelinesRepository = {
  list: (query) => prisma.guideline.findMany({ where: guidelineWhere(query), orderBy: { id: 'asc' }, take: query.limit + 1, include: guidelineInclude }),
  find: (id) => prisma.guideline.findUnique({ where: { id }, include: guidelineInclude }),
  history: (guidelineId, query) => prisma.guidelineVersion.findMany({ where: { guidelineId, ...(query.cursor ? { version: { lt: query.cursor } } : {}) }, orderBy: { version: 'desc' }, take: query.limit + 1 }),
  version: (guidelineId, version) => prisma.guidelineVersion.findUnique({ where: { guidelineId_version: { guidelineId, version } } }),
  withActor: (actorId, sessionId, id, operation) => prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE role = 'CHEFE' ORDER BY id FOR UPDATE`; await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR UPDATE`;
    if (id) await tx.$queryRaw`SELECT id FROM guidelines WHERE id = ${id} FOR UPDATE`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, name: true, email: true, role: true, isActive: true } });
    const session = await tx.authSession.findUnique({ where: { id: sessionId }, include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } } });
    const target = id ? await tx.guideline.findUnique({ where: { id }, include: guidelineInclude }) : null;
    const versionData = (input: CreateGuideline, version: number) => ({ ...input, version, authorId: actorId, authorName: actor?.name ?? '' });
    return operation({ actor, session, target,
      create: (input) => tx.guideline.create({ data: { ...input, createdById: actorId, updatedById: actorId, versions: { create: versionData(input, 1) } }, include: guidelineInclude }),
      update: (id, input, version) => tx.guideline.update({ where: { id }, data: { ...input, version, updatedById: actorId, versions: { create: versionData(input, version) } }, include: guidelineInclude }),
      async archive(id) { await tx.guideline.update({ where: { id }, data: { isArchived: true, updatedById: actorId } }); },
    });
  }),
};
export async function seedDemoGuidelines() {
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: 'chefia@example.invalid' } });
  for (const sample of [{ id: 'demo-guideline-sessao', title: 'Preparação de sessão fictícia', category: 'SESSOES', content: '# Antes da sessão\n\n- Conferir agenda fictícia.\n- Separar materiais de demonstração.\n\n**Sem dados processuais reais.**' }, { id: 'demo-guideline-equipe', title: 'Continuidade da equipe fictícia', category: 'EQUIPE', content: '# Continuidade\n\n1. Consultar rotinas essenciais.\n2. Conferir pendências da equipe.\n3. Usar contatos institucionais fictícios.' }] satisfies { id: string; title: string; category: Guideline['category']; content: string }[]) {
    await prisma.guideline.upsert({ where: { id: sample.id }, update: {}, create: { ...sample, essentialForTransition: true, createdById: actor.id, updatedById: actor.id, versions: { create: { title: sample.title, category: sample.category, content: sample.content, essentialForTransition: true, version: 1, authorId: actor.id, authorName: actor.name } } } });
  }
}
