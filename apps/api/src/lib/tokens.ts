import {
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { env } from './env.js';

export type AuthRole = 'CHEFE' | 'ASSESSOR' | 'APOIO';

type AccessPayload = {
  sub: string;
  role: AuthRole;
  iat: number;
  exp: number;
};

type RefreshPayload = {
  sub: string;
  tokenType: 'refresh';
  iat: number;
  exp: number;
};

const base64url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const signPart = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('base64url');

const ttlSeconds = (value: string): number => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error('INVALID_TOKEN_TTL');

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return amount * multiplier;
};

const createToken = (
  payload: Record<string, unknown>,
  secret: string,
  ttl: string,
): string => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + ttlSeconds(ttl),
    }),
  );
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${signPart(unsigned, secret)}`;
};

const verifyToken = <T extends { exp: number }>(
  token: string,
  secret: string,
): T => {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('INVALID_TOKEN');

  const unsigned = `${header}.${body}`;
  const expected = Buffer.from(signPart(unsigned, secret));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new Error('INVALID_TOKEN_SIGNATURE');
  }

  const payload = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8'),
  ) as T;

  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('TOKEN_EXPIRED');
  }

  return payload;
};

export const signAccessToken = async (
  userId: string,
  role: AuthRole,
): Promise<string> =>
  createToken(
    { sub: userId, role },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_TTL,
  );

export const signRefreshToken = async (userId: string): Promise<string> =>
  createToken(
    { sub: userId, tokenType: 'refresh' },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_TTL,
  );

export const verifyAccessToken = async (
  token: string,
): Promise<AccessPayload> => {
  const payload = verifyToken<AccessPayload>(token, env.JWT_ACCESS_SECRET);

  if (
    !payload.sub ||
    !['CHEFE', 'ASSESSOR', 'APOIO'].includes(payload.role)
  ) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  return payload;
};

export const verifyRefreshToken = async (
  token: string,
): Promise<RefreshPayload> => {
  const payload = verifyToken<RefreshPayload>(token, env.JWT_REFRESH_SECRET);

  if (!payload.sub || payload.tokenType !== 'refresh') {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  return payload;
};

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const getRefreshExpirationDate = (payload: RefreshPayload): Date =>
  new Date(payload.exp * 1000);
