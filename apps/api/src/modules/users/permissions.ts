import type { UserRole, UserSummary } from '@gabinete-plus/shared';

// Literal tuples preserve permission names in the union, without widening to string.
const commonPermissions = ['team:read', 'activities:read', 'tasks:read', 'contacts:read',
  'guidelines:read', 'profile:update-self', 'tasks:execute-assigned'] as const;
const managementPermissions = ['team:manage', 'activities:manage', 'contacts:manage',
  'guidelines:manage', 'tasks:assign', 'substitutions:manage'] as const;

export type Permission = typeof commonPermissions[number] | typeof managementPermissions[number];

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
