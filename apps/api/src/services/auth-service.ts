import {
  loginInputSchema,
  refreshInputSchema,
  type AuthUser,
} from '@gabinete-plus/shared';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import {
  getRefreshExpirationDate,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AuthRole,
} from '../lib/tokens.js';

const publicUser = (user: {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
}): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const issueTokens = async (user: { id: string; role: AuthRole }) => {
  const accessToken = await signAccessToken(user.id, user.role);
  const refreshToken = await signRefreshToken(user.id);
  const payload = await verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: getRefreshExpirationDate(payload),
    },
  });

  return { accessToken, refreshToken };
};

export const login = async (input: unknown) => {
  const credentials = loginInputSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase() },
  });

  if (!user) return { kind: 'invalid_credentials' as const };
  if (!user.isActive) return { kind: 'inactive' as const };

  const valid = await verifyPassword(user.passwordHash, credentials.password);
  if (!valid) return { kind: 'invalid_credentials' as const };

  const tokens = await issueTokens(user);
  return {
    kind: 'success' as const,
    user: publicUser(user),
    tokens,
  };
};

export const refreshSession = async (input: unknown) => {
  const { refreshToken } = refreshInputSchema.parse(input);

  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    return { kind: 'invalid_refresh' as const };
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (
    !stored ||
    stored.revokedAt ||
    stored.expiresAt <= new Date() ||
    !stored.user.isActive ||
    stored.user.id !== payload.sub
  ) {
    return { kind: 'invalid_refresh' as const };
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(stored.user);
  return { kind: 'success' as const, tokens };
};

export const getAuthenticatedUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return publicUser(user);
};
