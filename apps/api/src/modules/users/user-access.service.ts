import { userPermissionsSchema, type UserPermissions, type UserSummary } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import type { AuthorizationService, SessionPrincipal } from '../auth/authorization.service.js';
import { permissionsFor } from './permissions.js';

export interface UserAccessDependencies {
  findUser: (id: string) => Promise<UserSummary | null>;
}

export class UserAccessService {
  constructor(private readonly authorization: AuthorizationService, private readonly dependencies: UserAccessDependencies) {}

  async permissions(principal: SessionPrincipal, userId: string): Promise<UserPermissions> {
    // Authorization is mandatory even for callers that bypass the HTTP router.
    this.authorization.requirePermission(principal, 'team:manage');
    const user = await this.dependencies.findUser(userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'Usuário não encontrado.', 404);
    return userPermissionsSchema.parse({
      userId: user.id, role: user.role, isActive: user.isActive, permissions: permissionsFor(user),
    });
  }
}
