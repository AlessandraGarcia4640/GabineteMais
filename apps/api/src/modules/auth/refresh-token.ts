import { createHash, randomBytes } from 'node:crypto';

export const REFRESH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  // SHA-256 is sufficient for unguessable 256-bit random tokens, unlike human passwords.
  return createHash('sha256').update(token).digest('hex');
}
