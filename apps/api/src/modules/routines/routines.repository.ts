import type { CreateRoutine, RoutineListQuery, UserSummary } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';
import type { Routine as StoredRoutine } from '../../generated/prisma/client.js';
import type { SessionSnapshot } from '../auth/session.repository.js';
export type { Routine as StoredRoutine } from '../../generated/prisma/client.js';

function data(input: CreateRoutine) {
  return { ...input, specificDate: input.specificDate ? new Date(`${input.specificDate}T00:00:00.000Z`) : null };
}
export interface RoutineMutation {
  actor: UserSummary | null;
  session: SessionSnapshot | null;
  target: StoredRoutine | null;
  create: (input: CreateRoutine) => Promise<StoredRoutine>;
  update: (id: string, input: CreateRoutine) => Promise<StoredRoutine>;
  archive: (id: string) => Promise<void>;
}
export interface RoutinesRepository {
  find: (id: string) => Promise<StoredRoutine | null>;
  list: (query: RoutineListQuery) => Promise<StoredRoutine[]>;
  withActor: <T>(actorId: string, sessionId: string, targetId: string | null, operation: (context: RoutineMutation) => Promise<T>) => Promise<T>;
}
export const routinesRepository: RoutinesRepository = {
  find: (id) => prisma.routine.findUnique({ where: { id } }),
  list(query) {
    return prisma.routine.findMany({ where: {
      isArchived: query.isArchived,
      ...(query.scheduledFor ? { AND: [{ OR: [{ frequency: 'DIARIA', specificDate: null }, { specificDate: new Date(`${query.scheduledFor}T00:00:00.000Z`) }] }] } : {}),
      ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      ...(query.frequency ? { frequency: query.frequency } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.defaultPosition ? { defaultPosition: query.defaultPosition } : {}),
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {}),
    }, orderBy: { id: 'asc' }, take: query.limit + 1 });
  },
  withActor(actorId, sessionId, targetId, operation) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${actorId} FOR UPDATE`;
      if (targetId) await transaction.$queryRaw`SELECT "id" FROM "routines" WHERE "id" = ${targetId} FOR UPDATE`;
      const actor = await transaction.user.findUnique({ where: { id: actorId }, select: { id: true, name: true, email: true, role: true, isActive: true } });
      const session = await transaction.authSession.findUnique({ where: { id: sessionId }, select: {
        id: true, expiresAt: true, revokedAt: true, user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      } });
      const target = targetId ? await transaction.routine.findUnique({ where: { id: targetId } }) : null;
      return operation({ actor, session, target,
        create: (input) => transaction.routine.create({ data: { ...data(input), createdById: actorId, updatedById: actorId } }),
        update: (id, input) => transaction.routine.update({ where: { id }, data: { ...data(input), updatedById: actorId } }),
        async archive(id) { await transaction.routine.update({ where: { id }, data: { isArchived: true, updatedById: actorId } }); },
      });
    });
  },
};

export async function seedDemoRoutines(): Promise<void> {
  const actor = await prisma.user.findUnique({ where: { email: 'chefia@example.invalid' }, select: { id: true } });
  if (!actor) throw new Error('Prepare os usuários fictícios antes das atividades.');
  const examples: { id: string; input: CreateRoutine }[] = [
    { id: 'demo-routine-email', input: { title: 'Acompanhar e-mail do gabinete', category: 'Atendimento', frequency: 'DIARIA',
      description: 'Exemplo fictício de rotina administrativa.', instructions: 'Consultar mensagens e encaminhar demandas aos responsáveis.',
      steps: ['Consultar caixa de entrada', 'Identificar demandas', 'Encaminhar ao responsável'], defaultPosition: 'ASSESSOR_CHEFE',
      frequencyDetails: null, specificDate: null, essentialForTransition: true } },
    { id: 'demo-routine-sessao', input: { title: 'Preparar sessão de julgamento', category: 'Pré-sessão', frequency: 'SEMANAL',
      description: 'Preparação demonstrativa, sem dados processuais reais.', instructions: 'Conferir materiais e orientações internas.',
      steps: ['Conferir agenda', 'Separar materiais'], defaultPosition: 'ASSESSOR', frequencyDetails: 'Conforme agenda do gabinete',
      specificDate: null, essentialForTransition: true } },
    { id: 'demo-routine-evento', input: { title: 'Organizar reunião de equipe', category: 'Administrativo', frequency: 'EVENTUAL',
      description: 'Reunião fictícia para demonstração.', instructions: 'Confirmar pauta e participantes.', steps: ['Preparar pauta', 'Confirmar participantes'],
      defaultPosition: 'ASSESSOR_CHEFE', frequencyDetails: null, specificDate: '2026-11-03', essentialForTransition: false } },
  ];
  await prisma.$transaction(examples.map(({ id, input }) => prisma.routine.upsert({ where: { id }, update: {},
    create: { id, ...data(input), createdById: actor.id, updatedById: actor.id } })));
}
