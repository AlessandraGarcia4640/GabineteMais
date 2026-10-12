import type { HistoryQuery, UpdateProfile, UserListQuery, UserPosition, UserRole, UserSummary } from '@gabinete-plus/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/app-error.js';
import type { SessionSnapshot } from '../auth/session.repository.js';

const userSelect = { id: true, name: true, email: true, role: true, isActive: true,
  createdAt: true, updatedAt: true, positionHistory: { where: { endedAt: null }, take: 1,
    select: { id: true, userId: true, position: true, role: true, startedAt: true, endedAt: true } },
} satisfies Prisma.UserSelect;
type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;
export type StoredUser = UserSummary & { createdAt: Date; updatedAt: Date; position: UserPosition | null; positionStartedAt: Date | null };
export interface StoredPosition { id: string; userId: string; position: UserPosition; role: UserRole; startedAt: Date; endedAt: Date | null }
function publicUser(user: SelectedUser): StoredUser {
  const current = user.positionHistory[0];
  return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive,
    createdAt: user.createdAt, updatedAt: user.updatedAt, position: current?.position ?? null,
    positionStartedAt: current?.startedAt ?? null };
}
export interface NewManagedUser { name: string; email: string; passwordHash: string; position: UserPosition; role: UserRole }
export interface UserMutation {
  actor: UserSummary | null;
  session: SessionSnapshot | null;
  target: StoredUser | null;
  activeChiefCount: () => Promise<number>;
  emailOwner: (email: string) => Promise<UserSummary | null>;
  create: (data: NewManagedUser) => Promise<StoredUser>;
  updateProfile: (id: string, data: UpdateProfile) => Promise<StoredUser>;
  changePosition: (id: string, position: UserPosition, role: UserRole, at: Date) => Promise<StoredUser>;
  deactivate: (id: string, at: Date) => Promise<void>;
}
export interface ManagementRepository {
  find: (id: string) => Promise<StoredUser | null>;
  list: (query: UserListQuery) => Promise<StoredUser[]>;
  history: (id: string, query: HistoryQuery) => Promise<StoredPosition[]>;
  withUser: <T>(actorId: string, sessionId: string, targetId: string, action: (context: UserMutation) => Promise<T>) => Promise<T>;
}

export const managementRepository: ManagementRepository = {
  async find(id) { const user = await prisma.user.findUnique({ where: { id }, select: userSelect }); return user ? publicUser(user) : null; },
  async list(query) {
    const rows = await prisma.user.findMany({ where: {
      ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    }, orderBy: { id: 'asc' }, take: query.limit + 1, select: userSelect });
    return rows.map(publicUser);
  },
  history(id, query) {
    return prisma.userPositionHistory.findMany({ where: { userId: id, ...(query.cursor ? { id: { gt: query.cursor } } : {}) },
      orderBy: { id: 'asc' }, take: query.limit + 1 });
  },
  async withUser(actorId, sessionId, targetId, action) {
    try {
      return await prisma.$transaction(async (transaction) => {
        // All account mutations lock the chief rows in the same order: two chiefs cannot remove each other concurrently.
        await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "role" = 'CHEFE' ORDER BY "id" FOR UPDATE`;
        await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${actorId} OR "id" = ${targetId} ORDER BY "id" FOR UPDATE`;
        const actor = await transaction.user.findUnique({ where: { id: actorId }, select: userSelect });
        const target = await transaction.user.findUnique({ where: { id: targetId }, select: userSelect });
        const session = await transaction.authSession.findUnique({ where: { id: sessionId }, select: {
          id: true, expiresAt: true, revokedAt: true, user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        } });
        return action({ actor: actor ? publicUser(actor) : null, target: target ? publicUser(target) : null, session,
          activeChiefCount: () => transaction.user.count({ where: { role: 'CHEFE', isActive: true } }),
          emailOwner: (email) => transaction.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: userSelect }),
          async create(data) {
            const { position, ...fields } = data;
            const created = await transaction.user.create({ data: { ...fields, positionHistory: { create: { position, role: data.role } } }, select: userSelect });
            return publicUser(created);
          },
          async updateProfile(id, data) {
            const fields = { ...(data.name !== undefined ? { name: data.name } : {}), ...(data.email !== undefined ? { email: data.email } : {}) };
            return publicUser(await transaction.user.update({ where: { id }, data: fields, select: userSelect }));
          },
          async changePosition(id, position, role, at) {
            await transaction.userPositionHistory.updateMany({ where: { userId: id, endedAt: null }, data: { endedAt: at } });
            await transaction.userPositionHistory.create({ data: { userId: id, position, role, startedAt: at } });
            return publicUser(await transaction.user.update({ where: { id }, data: { role }, select: userSelect }));
          },
          async deactivate(id, at) {
            await transaction.user.update({ where: { id }, data: { isActive: false } });
            await transaction.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: at } });
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && error.meta?.modelName === 'User') {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'E-mail já cadastrado.', 409);
      }
      throw error;
    }
  },
};
