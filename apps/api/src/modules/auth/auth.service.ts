import { loginResponseSchema, userSummarySchema, type LoginRequest, type LoginResponse, type UserSummary } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { hashPassword, verifyPassword } from '../users/password.js';
import type { CredentialUser } from './auth.repository.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './access-token.js';

export interface LoginDependencies {
  findUser: (email: string) => Promise<CredentialUser | null>;
  issueToken: (user: UserSummary) => Promise<string>;
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
    return loginResponseSchema.parse({
      accessToken: await this.dependencies.issueToken(user),
      tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS, user,
    });
  }
}
