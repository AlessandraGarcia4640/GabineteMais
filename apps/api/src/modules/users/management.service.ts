import { positionPageSchema, roleForPosition, userDetailSchema, userPageSchema, type CreateUser, type HistoryQuery, type PositionPage,
  type UpdateProfile, type UserDetail, type UserListQuery, type UserPage, type UserPosition } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { hashPassword } from './password.js';
import type { ManagementRepository, StoredUser, UserMutation } from './management.repository.js';

function detail(user: StoredUser): UserDetail {
  return userDetailSchema.parse({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() });
}
function missing(): AppError { return new AppError('USER_NOT_FOUND', 'Usuário não encontrado.', 404); }

export class ManagementService {
  constructor(private readonly authorization: AuthorizationService, private readonly repository: ManagementRepository) {}

  private authorizeMutation(principal: SessionPrincipal, context: UserMutation, own = false): void {
    if (!context.actor) throw unauthenticated();
    if (!context.session) throw unauthenticated();
    if (context.actor.id !== principal.user.id || context.session.id !== principal.sessionId || context.session.user.id !== principal.user.id
      || context.session.revokedAt || context.session.expiresAt <= new Date()) throw unauthenticated();
    this.authorization.requirePermission({ ...principal, user: context.actor, expiresAt: context.session.expiresAt }, own ? 'profile:update-self' : 'team:manage');
  }

  async list(principal: SessionPrincipal, query: UserListQuery): Promise<UserPage> {
    this.authorization.requirePermission(principal, 'team:read');
    const rows = await this.repository.list(query);
    const visible = rows.slice(0, query.limit);
    return userPageSchema.parse({ items: visible.map(detail), nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }

  async get(principal: SessionPrincipal, id: string): Promise<UserDetail> {
    this.authorization.requirePermission(principal, 'team:read');
    const user = await this.repository.find(id);
    if (!user) throw missing();
    return detail(user);
  }

  async history(principal: SessionPrincipal, id: string, query: HistoryQuery): Promise<PositionPage> {
    this.authorization.requirePermission(principal, 'team:read');
    if (!await this.repository.find(id)) throw missing();
    const rows = await this.repository.history(id, query);
    const visible = rows.slice(0, query.limit);
    return positionPageSchema.parse({ items: visible.map((row) => ({ ...row, startedAt: row.startedAt.toISOString(), endedAt: row.endedAt?.toISOString() ?? null })),
      nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }

  async create(principal: SessionPrincipal, input: CreateUser): Promise<UserDetail> {
    this.authorization.requirePermission(principal, 'team:manage');
    const passwordHash = await hashPassword(input.password);
    return this.repository.withUser(principal.user.id, principal.sessionId, principal.user.id, async (context) => {
      this.authorizeMutation(principal, context);
      if (await context.emailOwner(input.email)) throw new AppError('EMAIL_ALREADY_EXISTS', 'E-mail já cadastrado.', 409);
      return detail(await context.create({ name: input.name, email: input.email, passwordHash, position: input.position, role: roleForPosition(input.position) }));
    });
  }

  async update(principal: SessionPrincipal, id: string, input: UpdateProfile, own = false): Promise<UserDetail> {
    if (own && id !== principal.user.id) throw new AppError('FORBIDDEN', 'Você não tem permissão para esta operação.', 403);
    this.authorization.requirePermission(principal, own ? 'profile:update-self' : 'team:manage');
    return this.repository.withUser(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorizeMutation(principal, context, own);
      if (!context.target) throw missing();
      if (input.email) {
        const owner = await context.emailOwner(input.email);
        if (owner && owner.id !== id) throw new AppError('EMAIL_ALREADY_EXISTS', 'E-mail já cadastrado.', 409);
      }
      return detail(await context.updateProfile(id, input));
    });
  }

  async position(principal: SessionPrincipal, id: string, position: UserPosition): Promise<UserDetail> {
    this.authorization.requirePermission(principal, 'team:manage');
    return this.repository.withUser(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorizeMutation(principal, context);
      const target = context.target;
      if (!target) throw missing();
      const role = roleForPosition(position);
      if (target.isActive && target.role === 'CHEFE' && role !== 'CHEFE' && await context.activeChiefCount() <= 1) {
        throw new AppError('LAST_ACTIVE_CHIEF', 'Mantenha ao menos um usuário de chefia ativo.', 409);
      }
      if (target.position === position && target.role === role) return detail(target);
      const at = new Date(Math.max(Date.now(), (target.positionStartedAt?.getTime() ?? 0) + 1));
      return detail(await context.changePosition(id, position, role, at));
    });
  }

  async deactivate(principal: SessionPrincipal, id: string): Promise<void> {
    this.authorization.requirePermission(principal, 'team:manage');
    await this.repository.withUser(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorizeMutation(principal, context);
      const target = context.target;
      if (!target) throw missing();
      if (target.isActive && target.role === 'CHEFE' && await context.activeChiefCount() <= 1) {
        throw new AppError('LAST_ACTIVE_CHIEF', 'Mantenha ao menos um usuário de chefia ativo.', 409);
      }
      await context.deactivate(id, new Date());
    });
  }
}
