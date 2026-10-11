import { z } from 'zod';
import { userRoleSchema, userSummarySchema } from './users.js';

export const permissionSchema = z.enum([
  'team:read', 'activities:read', 'tasks:read', 'contacts:read', 'guidelines:read',
  'profile:update-self', 'tasks:execute-assigned', 'team:manage', 'activities:manage',
  'contacts:manage', 'guidelines:manage', 'tasks:assign', 'substitutions:manage',
  'checklists:read', 'checklists:manage', 'checklists:execute-assigned',
]);
export type Permission = z.infer<typeof permissionSchema>;

export const currentAccessSchema = z.object({
  user: userSummarySchema,
  permissions: z.array(permissionSchema),
});
export type CurrentAccess = z.infer<typeof currentAccessSchema>;

export const userPermissionsSchema = z.object({
  userId: z.string().min(1),
  role: userRoleSchema,
  isActive: z.boolean(),
  permissions: z.array(permissionSchema),
});
export type UserPermissions = z.infer<typeof userPermissionsSchema>;

export const userIdParamsSchema = z.object({ id: z.string().min(1).max(128) });
export const emptyQuerySchema = z.object({}).strict();
