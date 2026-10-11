import { expect, it, vi } from 'vitest';
import { createUserSchema, updateProfileSchema, userListQuerySchema, type UserPosition, type UserRole } from '@gabinete-plus/shared';
import { AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { ManagementService } from './management.service.js';
import type { ManagementRepository, NewManagedUser, StoredUser, UserMutation } from './management.repository.js';

function fixture(role: UserRole = 'CHEFE') {
  const actor: StoredUser = { id: 'actor', name: 'Ator Fictício', email: 'actor@example.invalid', role, isActive: true,
    position: role === 'CHEFE' ? 'ASSESSOR_CHEFE' : 'ASSESSOR', createdAt: new Date(), updatedAt: new Date(), positionStartedAt: new Date() };
  const target: StoredUser = { ...actor, id: 'target', email: 'target@example.invalid' };
  const principal: SessionPrincipal = { sessionId: 'session', expiresAt: new Date(Date.now() + 86400000), user: actor };
  const activeChiefCount = vi.fn(() => Promise.resolve(2));
  const emailOwner = vi.fn((): Promise<StoredUser | null> => Promise.resolve(null));
  const create = vi.fn((data: NewManagedUser) => Promise.resolve({ ...target, name: data.name, email: data.email, role: data.role, position: data.position }));
  const updateProfile = vi.fn((_id: string, data: { name?: string | undefined; email?: string | undefined }) => Promise.resolve({ ...target,
    ...(data.name !== undefined ? { name: data.name } : {}), ...(data.email !== undefined ? { email: data.email } : {}) }));
  const changePosition = vi.fn((_id: string, position: UserPosition, nextRole: UserRole, at: Date) => Promise.resolve({ ...target, position, role: nextRole, positionStartedAt: at }));
  const deactivate = vi.fn(() => Promise.resolve());
  const context: UserMutation = { actor, target, session: { id: principal.sessionId, expiresAt: principal.expiresAt, revokedAt: null, user: actor },
    activeChiefCount, emailOwner, create, updateProfile, changePosition, deactivate };
  const find = vi.fn((): Promise<StoredUser | null> => Promise.resolve(target));
  const repository: ManagementRepository = {
    find, list: () => Promise.resolve([actor, target]), history: () => Promise.resolve([]),
    withUser(_actorId, _sessionId, _targetId, action) { return action(context); },
  };
  const authorization = new AuthorizationService({ verifyToken: () => Promise.resolve(null), findSession: () => Promise.resolve(null) });
  return { service: new ManagementService(authorization, repository), principal, context, actor, target, emailOwner, create, changePosition, deactivate, activeChiefCount, updateProfile, find };
}

it('somente chefia cria usuário e armazena hash em vez da senha', async () => {
  const input = createUserSchema.parse({ name: ' Novo ', email: ' NOVO@example.invalid ', password: 'Senha-ficticia-27', position: 'APOIO' });
  const chief = fixture();
  const result = await chief.service.create(chief.principal, input);
  expect(result.role).toBe('APOIO');
  expect(result.email).toBe('novo@example.invalid');
  expect(chief.create.mock.calls[0]?.[0].passwordHash).toMatch(/^\$argon2id\$/);
  expect(result).not.toHaveProperty('passwordHash');
  const assessor = fixture('ASSESSOR');
  await expect(assessor.service.create(assessor.principal, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(assessor.create).not.toHaveBeenCalled();
});

it('revalida autoridade e sessão dentro da transação', async () => {
  const { service, principal, context, deactivate } = fixture();
  context.actor = { ...principal.user, role: 'ASSESSOR' };
  await expect(service.deactivate(principal, 'target')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  context.actor = principal.user;
  context.session = null;
  await expect(service.deactivate(principal, 'target')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(deactivate).not.toHaveBeenCalled();
});

it('não desativa nem rebaixa a última chefia ativa', async () => {
  const { service, principal, activeChiefCount, deactivate, changePosition } = fixture();
  activeChiefCount.mockResolvedValue(1);
  await expect(service.deactivate(principal, 'target')).rejects.toMatchObject({ code: 'LAST_ACTIVE_CHIEF' });
  await expect(service.position(principal, 'target', 'APOIO')).rejects.toMatchObject({ code: 'LAST_ACTIVE_CHIEF' });
  expect(deactivate).not.toHaveBeenCalled();
  expect(changePosition).not.toHaveBeenCalled();
});

it('não cria histórico duplicado para cargo já vigente', async () => {
  const { service, principal, changePosition } = fixture();
  await service.position(principal, 'target', 'ASSESSOR_CHEFE');
  expect(changePosition).not.toHaveBeenCalled();
});

it('fechamento de histórico sempre é posterior ao início', async () => {
  const { service, principal, context, changePosition } = fixture();
  const started = new Date(Date.now() + 1);
  if (!context.target) throw new Error('Alvo ausente.');
  context.target.positionStartedAt = started;
  await service.position(principal, 'target', 'ASSESSOR');
  const args = changePosition.mock.calls[0];
  expect(changePosition).toHaveBeenCalledWith('target', 'ASSESSOR', 'ASSESSOR', expect.any(Date));
  expect(args).toBeDefined();
  expect(args?.[3].getTime()).toBeGreaterThan(started.getTime());
});

it('impede e-mail duplicado e alteração de perfil alheio por edição própria', async () => {
  const { service, principal, emailOwner, updateProfile, target } = fixture();
  emailOwner.mockResolvedValue(target);
  await expect(service.update(principal, 'actor', { email: target.email }, true)).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' });
  await expect(service.update(principal, 'target', { name: 'Novo' }, true)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(updateProfile).not.toHaveBeenCalled();
});

it('valida paginação, booleano false e edição sem privilégio ou campo vazio', () => {
  expect(userListQuerySchema.parse({ isActive: 'false' }).isActive).toBe(false);
  expect(userListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(updateProfileSchema.safeParse({}).success).toBe(false);
  expect(updateProfileSchema.safeParse({ name: 'Nome', role: 'CHEFE' }).success).toBe(false);
});

it('consulta paginada e detalhe retornam erro controlado para alvo ausente', async () => {
  const { service, principal, find } = fixture('APOIO');
  const page = await service.list(principal, { limit: 1 });
  expect(page.items).toHaveLength(1);
  expect(page.nextCursor).toBe('actor');
  find.mockResolvedValueOnce(null);
  await expect(service.get(principal, 'missing')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
});
