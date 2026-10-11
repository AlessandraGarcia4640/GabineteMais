import { z } from 'zod';
import { currentAccessSchema, userSummarySchema, type CurrentAccess, type Permission, type UserRole, type UserSummary } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { hasPermission, permissionsFor } from '../users/permissions.js';
import type { AccessClaims } from './access-token.js';
import type { SessionSnapshot } from './session.repository.js';

export interface SessionPrincipal {
  sessionId: string;
  expiresAt: Date;
  user: UserSummary;
}

export interface AuthorizationDependencies {
  verifyToken: (token: string) => Promise<AccessClaims | null>;
  findSession: (id: string) => Promise<SessionSnapshot | null>;
}

export function unauthenticated(): AppError {
  return new AppError('UNAUTHENTICATED', 'Sessão inválida. Entre novamente.', 401);
}

const bearerHeaderSchema = z.string().max(8192).regex(/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i);

export class AuthorizationService {
  constructor(private readonly dependencies: AuthorizationDependencies) {}

  async authenticate(header: string | undefined): Promise<SessionPrincipal> {
    const parsedHeader = bearerHeaderSchema.safeParse(header);
    if (!parsedHeader.success) throw unauthenticated();
    const token = parsedHeader.data.split(' ')[1];
    if (!token) throw unauthenticated();
    const claims = await this.dependencies.verifyToken(token);
    if (!claims) throw unauthenticated();
    const session = await this.dependencies.findSession(claims.sid);
    if (!session) throw unauthenticated();
    if (session.id !== claims.sid || session.revokedAt || session.expiresAt <= new Date()
      || session.user.id !== claims.sub || !session.user.isActive) throw unauthenticated();
    // Permissions come from the current database user, never from the role in the JWT.
    return { sessionId: session.id, expiresAt: session.expiresAt, user: userSummarySchema.parse(session.user) };
  }

  requireActive(principal: SessionPrincipal): void {
    if (!principal.user.isActive || principal.expiresAt <= new Date()) throw unauthenticated();
  }

  requirePermission(principal: SessionPrincipal, permission: Permission): void {
    this.requireActive(principal);
    if (!hasPermission(principal.user, permission)) throw new AppError('FORBIDDEN', 'Você não tem permissão para esta operação.', 403);
  }

  requireRole(principal: SessionPrincipal, roles: readonly UserRole[]): void {
    this.requireActive(principal);
    if (!roles.includes(principal.user.role)) throw new AppError('FORBIDDEN', 'Você não tem permissão para esta operação.', 403);
  }

  currentAccess(principal: SessionPrincipal): CurrentAccess {
    this.requireActive(principal);
    return currentAccessSchema.parse({ user: principal.user, permissions: permissionsFor(principal.user) });
  }
}
