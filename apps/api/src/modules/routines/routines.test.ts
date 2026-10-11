import { expect, it, vi } from 'vitest';
import { createRoutineSchema, type CreateRoutine, type UserRole } from '@gabinete-plus/shared';
import { AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { RoutinesService } from './routines.service.js';
import type { RoutineMutation, RoutinesRepository, StoredRoutine } from './routines.repository.js';

function fixture(role: UserRole = 'CHEFE') {
  const user = { id: 'actor', name: 'Pessoa Fictícia', email: 'actor@example.invalid', role, isActive: true };
  const principal: SessionPrincipal = { sessionId: 'session', expiresAt: new Date(Date.now() + 86400000), user };
  const input = createRoutineSchema.parse({ title: 'Rotina Fictícia', category: 'Administrativo', frequency: 'DIARIA' });
  const row: StoredRoutine = { ...input, specificDate: null, id: 'routine', isArchived: false, createdById: user.id, updatedById: user.id, createdAt: new Date(), updatedAt: new Date() };
  const update = vi.fn((_id: string, data: CreateRoutine) => Promise.resolve({ ...row, ...data, specificDate: data.specificDate ? new Date(data.specificDate + 'T00:00:00Z') : null }));
  const archive = vi.fn(() => Promise.resolve());
  const create = vi.fn(() => Promise.resolve(row));
  const context: RoutineMutation = { actor: user, session: { id: principal.sessionId, expiresAt: principal.expiresAt, revokedAt: null, user }, target: row, create, update, archive };
  const repository: RoutinesRepository = { find: () => Promise.resolve(context.target), list: () => Promise.resolve([row]),
    withActor(_actor, _session, _target, operation) { return operation(context); } };
  const authorization = new AuthorizationService({ verifyToken: () => Promise.resolve(null), findSession: () => Promise.resolve(null) });
  return { service: new RoutinesService(authorization, repository), principal, input, row, context, update, create, archive };
}
it('service nega gestão a assessor mesmo sem middleware', async () => {
  const { service, principal, input, create, archive } = fixture('ASSESSOR');
  await expect(service.create(principal, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(service.archive(principal, 'routine')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(create).not.toHaveBeenCalled(); expect(archive).not.toHaveBeenCalled();
});
it('revalida ator e sessão na transação', async () => {
  const { service, principal, input, context, create } = fixture();
  context.actor = { ...principal.user, role: 'APOIO' };
  await expect(service.create(principal, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  context.actor = principal.user; context.session = null;
  await expect(service.create(principal, input)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(create).not.toHaveBeenCalled();
});
it('valida combinação final da frequência durante patch', async () => {
  const { service, principal, update } = fixture();
  await expect(service.update(principal, 'routine', { frequency: 'PERSONALIZADA' })).rejects.toThrow();
  expect(update).not.toHaveBeenCalled();
  await service.update(principal, 'routine', { frequency: 'PERSONALIZADA', frequencyDetails: 'A cada dois dias' });
  expect(update).toHaveBeenCalledTimes(1);
});
it('arquivamento é idempotente e impede edição', async () => {
  const { service, principal, row, archive } = fixture();
  await service.archive(principal, row.id); expect(archive).toHaveBeenCalledTimes(1);
  row.isArchived = true;
  await service.archive(principal, row.id); expect(archive).toHaveBeenCalledTimes(1);
  await expect(service.update(principal, row.id, { title: 'Novo' })).rejects.toMatchObject({ code: 'ROUTINE_ARCHIVED' });
});
it('alvo inexistente retorna erro controlado', async () => {
  const { service, principal, context } = fixture(); context.target = null;
  await expect(service.get(principal, 'missing')).rejects.toMatchObject({ code: 'ROUTINE_NOT_FOUND' });
  await expect(service.archive(principal, 'missing')).rejects.toMatchObject({ code: 'ROUTINE_NOT_FOUND' });
});
