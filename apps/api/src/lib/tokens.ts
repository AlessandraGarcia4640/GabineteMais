import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { env } from './env.js';

export type AuthRole = 'CHEFE' | 'ASSESSOR' | 'APOIO';

interface BasePayload {
  sub: string;
  iat: number;
  exp: number;
}

interface AccessPayload extends BasePayload {
  role: AuthRole;
}

interface RefreshPayload extends BasePayload {
  tokenType: 'refresh';
  jti: string;
}

const base64url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const signPart = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('base64url');

const ttlSeconds = (value: string): number => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error('INVALID_TOKEN_TTL');

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;

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

const verifyRawToken = (
  token: string,
  secret: string,
): Record<string, unknown> => {
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

  const parsed: unknown = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8'),
  );

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('INVALID_TOKEN_PAYLOAD');
  }

  return parsed as Record<string, unknown>;
};

const readBasePayload = (payload: Record<string, unknown>): BasePayload => {
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('INVALID_TOKEN_PAYLOAD');
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('TOKEN_EXPIRED');
  }

  return {
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
  };
};

export const signAccessToken = (
  userId: string,
  role: AuthRole,
): string =>
  createToken(
    { sub: userId, role },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_TTL,
  );

export const signRefreshToken = (userId: string): string =>
  createToken(
    { sub: userId, tokenType: 'refresh', jti: randomUUID() },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_TTL,
  );

export const verifyAccessToken = (token: string): AccessPayload => {
  const raw = verifyRawToken(token, env.JWT_ACCESS_SECRET);
  const base = readBasePayload(raw);

  if (
    raw.role !== 'CHEFE' &&
    raw.role !== 'ASSESSOR' &&
    raw.role !== 'APOIO'
  ) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  return { ...base, role: raw.role };
};

export const verifyRefreshToken = (token: string): RefreshPayload => {
  const raw = verifyRawToken(token, env.JWT_REFRESH_SECRET);
  const base = readBasePayload(raw);

  if (raw.tokenType !== 'refresh' || typeof raw.jti !== 'string') {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  return { ...base, tokenType: 'refresh', jti: raw.jti };
};

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const getRefreshExpirationDate = (payload: RefreshPayload): Date =>
  new Date(payload.exp * 1000);
