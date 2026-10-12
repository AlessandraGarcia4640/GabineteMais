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
  email: z.string().trim().pipe(z.email('Informe um e-mail válido.')),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
}).strict();
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  refreshExpiresAt: z.iso.datetime(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.literal(900),
  user: userSummarySchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Token de renovação inválido.'),
}).strict();
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export const refreshResponseSchema = loginResponseSchema;
export type RefreshResponse = LoginResponse;
export const logoutRequestSchema = refreshRequestSchema;

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string().min(1), message: z.string().min(1), details: z.json().optional() }),
});
