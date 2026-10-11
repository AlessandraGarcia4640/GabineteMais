import type { Permission, UserRole, UserSummary } from '@gabinete-plus/shared';
export type { Permission } from '@gabinete-plus/shared';

const commonPermissions: readonly Permission[] = ['team:read', 'activities:read', 'tasks:read', 'contacts:read',
  'guidelines:read', 'profile:update-self', 'tasks:execute-assigned', 'checklists:read', 'checklists:execute-assigned'];
const managementPermissions: readonly Permission[] = ['team:manage', 'activities:manage', 'contacts:manage',
  'guidelines:manage', 'tasks:assign', 'substitutions:manage', 'checklists:manage'];

const rolePermissions: Record<UserRole, readonly Permission[]> = {
  CHEFE: [...commonPermissions, ...managementPermissions],
  ASSESSOR: commonPermissions,
  APOIO: commonPermissions,
};

export function permissionsFor(user: Pick<UserSummary, 'role' | 'isActive'>): readonly Permission[] {
  return user.isActive ? rolePermissions[user.role] : [];
}

export function hasPermission(user: Pick<UserSummary, 'role' | 'isActive'>, permission: Permission): boolean {
  return permissionsFor(user).includes(permission);
}

export function canExecuteAssignedTask(user: UserSummary, assigneeId: string): boolean {
  return user.id === assigneeId && hasPermission(user, 'tasks:execute-assigned');
}
