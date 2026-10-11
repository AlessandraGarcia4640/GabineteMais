import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import type { UserSummary } from '@gabinete-plus/shared';

export const ACCESS_TOKEN_TTL_SECONDS = 900;
export const ACCESS_TOKEN_ISSUER = 'gabinete-plus-api';
export const ACCESS_TOKEN_AUDIENCE = 'gabinete-plus-mobile';

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
