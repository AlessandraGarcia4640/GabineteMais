import type { UserSummary } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';

export interface NewSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface LockedRefreshToken {
  sessionId: string;
  consumedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  user: UserSummary;
  revoke: (now: Date) => Promise<void>;
  rotate: (nextHash: string, now: Date) => Promise<void>;
}

export interface SessionRepository {
  create: (session: NewSession) => Promise<void>;
  withToken: <T>(hash: string, operation: (record: LockedRefreshToken | null) => Promise<T>) => Promise<T>;
}

export interface SessionSnapshot {
  id: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: UserSummary;
}

export function findSession(id: string): Promise<SessionSnapshot | null> {
  return prisma.authSession.findUnique({ where: { id }, select: {
    id: true, expiresAt: true, revokedAt: true,
    user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
  } });
}

export const sessionRepository: SessionRepository = {
  async create({ id, userId, expiresAt, tokenHash }) {
    await prisma.authSession.create({ data: {
      id, userId, expiresAt, refreshTokens: { create: { tokenHash } },
    } });
  },

  withToken(hash, operation) {
    return prisma.$transaction(async (transaction) => {
      const reference = await transaction.refreshToken.findUnique({ where: { tokenHash: hash }, select: { sessionId: true } });
      if (!reference) return operation(null);
      // Serialize refresh and logout on the session, then reread state after acquiring the lock.
      await transaction.$queryRaw`SELECT "id" FROM "auth_sessions" WHERE "id" = ${reference.sessionId} FOR UPDATE`;
      const record = await transaction.refreshToken.findUnique({ where: { tokenHash: hash }, include: {
        session: { include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } } },
      } });
      if (!record) return operation(null);
      return operation({
        sessionId: record.sessionId, consumedAt: record.consumedAt,
        expiresAt: record.session.expiresAt, revokedAt: record.session.revokedAt, user: record.session.user,
        async revoke(now) {
          await transaction.authSession.updateMany({ where: { id: record.sessionId, revokedAt: null }, data: { revokedAt: now } });
        },
        async rotate(nextHash, now) {
          await transaction.refreshToken.update({ where: { id: record.id }, data: { consumedAt: now } });
          await transaction.refreshToken.create({ data: { sessionId: record.sessionId, tokenHash: nextHash } });
        },
      });
    });
  },
};
