import { z } from 'zod';

export const userRoleSchema = z.enum(['CHEFE', 'ASSESSOR', 'APOIO']);

export const loginInputSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório.'),
});

export const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const loginResponseSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema,
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RefreshInput = z.infer<typeof refreshInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
