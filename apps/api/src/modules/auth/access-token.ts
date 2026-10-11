import { randomUUID } from 'node:crypto';
import { errors, jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { userRoleSchema, type UserSummary } from '@gabinete-plus/shared';

export const ACCESS_TOKEN_TTL_SECONDS = 900;
export const ACCESS_TOKEN_ISSUER = 'gabinete-plus-api';
export const ACCESS_TOKEN_AUDIENCE = 'gabinete-plus-mobile';

const accessClaimsSchema = z.object({
  sub: z.string().min(1), sid: z.uuid(), role: userRoleSchema,
  iat: z.number().int().nonnegative(), exp: z.number().int().positive(), jti: z.uuid(),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

export function createAccessTokenVerifier(secret: string): (token: string) => Promise<AccessClaims | null> {
  const key = new TextEncoder().encode(secret);
  if (key.length < 32) throw new Error('Chave de assinatura insuficiente.');
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'], typ: 'JWT', issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE, maxTokenAge: '15m',
        requiredClaims: ['sub', 'sid', 'role', 'iat', 'exp', 'jti'],
      });
      const parsed = accessClaimsSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    } catch (error) {
      if (error instanceof errors.JOSEError) return null;
      throw error;
    }
  };
}

export function createAccessTokenIssuer(secret: string): (user: UserSummary, sessionId: string) => Promise<string> {
  const key = new TextEncoder().encode(secret);
  if (key.length < 32) throw new Error('Chave de assinatura insuficiente.');
  return (user, sessionId) => {
    const issuedAt = Math.floor(Date.now() / 1000);
    return new SignJWT({ role: user.role, sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(ACCESS_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setJti(randomUUID())
    .setExpirationTime(issuedAt + ACCESS_TOKEN_TTL_SECONDS)
    .sign(key);
  };
}
