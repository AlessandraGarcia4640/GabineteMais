import { z } from 'zod';

export const userRoleSchema = z.enum(['CHEFE', 'ASSESSOR', 'APOIO']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userPositionSchema = z.enum(['MAGISTRADO_GESTOR', 'ASSESSOR_CHEFE', 'ASSESSOR', 'APOIO']);
export type UserPosition = z.infer<typeof userPositionSchema>;

export const userSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  email: z.email(),
  role: userRoleSchema,
  isActive: z.boolean(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const positionHistorySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  position: userPositionSchema,
  role: userRoleSchema,
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
}).refine((entry) => entry.endedAt === null || Date.parse(entry.endedAt) > Date.parse(entry.startedAt), {
  path: ['endedAt'], message: 'O término deve ser posterior ao início.',
});

export const loginRequestSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;
