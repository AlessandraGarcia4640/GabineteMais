import { z } from 'zod';
import { positionHistorySchema, userPositionSchema, userRoleSchema, userSummarySchema, type UserPosition, type UserRole } from './users.js';

const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const createUserSchema = z.object({
  name: nameSchema, email: emailSchema,
  password: z.string().min(12).max(128), position: userPositionSchema,
}).strict();
export type CreateUser = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z.object({ name: nameSchema.optional(), email: emailSchema.optional() })
  .strict().refine((value) => value.name !== undefined || value.email !== undefined, 'Informe nome ou e-mail.');
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export const changePositionSchema = z.object({ position: userPositionSchema }).strict();

export const userDetailSchema = userSummarySchema.extend({
  position: userPositionSchema.nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export type UserDetail = z.infer<typeof userDetailSchema>;

export const userListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(128).optional(),
  role: userRoleSchema.optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).strict();
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export const historyQuerySchema = userListQuerySchema.pick({ limit: true, cursor: true }).strict();
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export const userPageSchema = z.object({ items: z.array(userDetailSchema), nextCursor: z.string().nullable() });
export type UserPage = z.infer<typeof userPageSchema>;
export const positionPageSchema = z.object({ items: z.array(positionHistorySchema), nextCursor: z.string().nullable() });
export type PositionPage = z.infer<typeof positionPageSchema>;

const positionRoles: Record<UserPosition, UserRole> = {
  MAGISTRADO_GESTOR: 'CHEFE', ASSESSOR_CHEFE: 'CHEFE', ASSESSOR: 'ASSESSOR', APOIO: 'APOIO',
};
export function roleForPosition(position: UserPosition): UserRole { return positionRoles[position]; }
