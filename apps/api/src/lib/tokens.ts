import { createHash } from 'node:crypto';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { env } from './env.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export type AuthRole = 'CHEFE' | 'ASSESSOR' | 'APOIO';

type AccessPayload = JWTPayload & {
  role: AuthRole;
};

export const signAccessToken = async (
  userId: string,
  role: AuthRole,
): Promise<string> =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);

export const signRefreshToken = async (userId: string): Promise<string> =>
  new SignJWT({ tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret);

export const verifyAccessToken = async (token: string): Promise<AccessPayload> => {
  const { payload } = await jwtVerify(token, accessSecret);
  if (!payload.sub || !['CHEFE', 'ASSESSOR', 'APOIO'].includes(String(payload.role))) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }
  return payload as AccessPayload;
};

export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(token, refreshSecret);
  if (!payload.sub || payload.tokenType !== 'refresh') {
    throw new Error('INVALID_REFRESH_TOKEN');
  }
  return payload;
};

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const getRefreshExpirationDate = (payload: JWTPayload): Date => {
  if (!payload.exp) {
    throw new Error('INVALID_REFRESH_EXPIRATION');
  }
  return new Date(payload.exp * 1000);
};
