import { randomUUID } from 'node:crypto';
import { loginResponseSchema, userSummarySchema, type LoginRequest, type LoginResponse, type RefreshRequest, type UserSummary } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { hashPassword, verifyPassword } from '../users/password.js';
import type { CredentialUser } from './auth.repository.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './access-token.js';
import { createRefreshToken, hashRefreshToken, REFRESH_SESSION_TTL_MS } from './refresh-token.js';
import type { SessionRepository } from './session.repository.js';

export interface LoginDependencies {
  findUser: (email: string) => Promise<CredentialUser | null>;
  issueToken: (user: UserSummary, sessionId: string) => Promise<string>;
  sessions: SessionRepository;
}

export class LoginService {
  private readonly dummyHash = hashPassword('conta-inexistente-ficticia');

  constructor(private readonly dependencies: LoginDependencies) {}

  async login(input: LoginRequest): Promise<LoginResponse> {
    const candidate = await this.dependencies.findUser(input.email);
    // Missing users also incur a password verification; never return before hashing.
    const validPassword = await verifyPassword(candidate?.passwordHash ?? await this.dummyHash, input.password);
    if (!candidate || !candidate.isActive || !validPassword) {
      throw new AppError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401);
    }
    const user = userSummarySchema.parse(candidate);
    const id = randomUUID();
    const refreshToken = createRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_MS);
    const response = loginResponseSchema.parse({
      accessToken: await this.dependencies.issueToken(user, id),
      refreshToken, refreshExpiresAt: expiresAt.toISOString(),
      tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS, user,
    });
    await this.dependencies.sessions.create({ id, userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt });
    return response;
  }

  async refresh(input: RefreshRequest): Promise<LoginResponse> {
    const nextToken = createRefreshToken();
    const result = await this.dependencies.sessions.withToken(hashRefreshToken(input.refreshToken), async (record) => {
      if (!record) return null;
      const now = new Date();
      if (record.consumedAt || record.revokedAt || record.expiresAt <= now || !record.user.isActive) {
        await record.revoke(now);
        return null;
      }
      const user = userSummarySchema.parse(record.user);
      const response = loginResponseSchema.parse({
        accessToken: await this.dependencies.issueToken(user, record.sessionId),
        refreshToken: nextToken, refreshExpiresAt: record.expiresAt.toISOString(),
        tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS, user,
      });
      await record.rotate(hashRefreshToken(nextToken), now);
      return response;
    });
    // Throw outside the transaction so replay/expiry revocation is committed.
    if (!result) throw new AppError('INVALID_REFRESH_TOKEN', 'Sessão inválida ou expirada. Entre novamente.', 401);
    return result;
  }

  async logout(input: RefreshRequest): Promise<void> {
    await this.dependencies.sessions.withToken(hashRefreshToken(input.refreshToken), async (record) => {
      if (record) await record.revoke(new Date());
    });
  }
}
