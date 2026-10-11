import { expect, it, vi } from 'vitest';
import { createContactSchema, type CreateContact, type UserRole } from '@gabinete-plus/shared';
import { AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import { ContactsService } from './contacts.service.js';
import type { ContactMutation, ContactsRepository, StoredContact } from './contacts.repository.js';
function fixture(role: UserRole = 'CHEFE') {
  const user = { id: 'actor', name: 'Pessoa Fictícia', email: 'actor@example.invalid', role, isActive: true };
  const principal: SessionPrincipal = { user, sessionId: 'session', expiresAt: new Date(Date.now() + 86400000) };
  const input = createContactSchema.parse({ name: 'Contato Fictício', organization: 'Órgão Fictício' });
  const row: StoredContact = { ...input, id: 'contact', searchText: 'Contato Fictício Órgão Fictício', isArchived: false,
    createdById: user.id, updatedById: user.id, createdAt: new Date(), updatedAt: new Date() };
  const update = vi.fn((_id: string, data: CreateContact) => Promise.resolve({ ...row, ...data }));
  const create = vi.fn(() => Promise.resolve(row)); const archive = vi.fn(() => Promise.resolve());
  const context: ContactMutation = { actor: user, session: { id: principal.sessionId, user, expiresAt: principal.expiresAt, revokedAt: null }, target: row, create, update, archive };
  const repository: ContactsRepository = { find: () => Promise.resolve(context.target), list: () => Promise.resolve([row]),
    withActor(_actor, _session, _target, operation) { return operation(context); } };
  const auth = new AuthorizationService({ verifyToken: () => Promise.resolve(null), findSession: () => Promise.resolve(null) });
  return { service: new ContactsService(auth, repository), principal, context, input, row, create, update, archive };
}
it('service impede gestão por assessor sem depender do router', async () => {
  const { service, principal, input, create } = fixture('ASSESSOR');
  await expect(service.create(principal, input)).rejects.toMatchObject({ code: 'FORBIDDEN' }); expect(create).not.toHaveBeenCalled();
});
it('revalida ator/sessão e não grava após perda de privilégio', async () => {
  const { service, principal, input, context, create } = fixture(); context.actor = { ...principal.user, role: 'APOIO' };
  await expect(service.create(principal, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  context.actor = principal.user; context.session = null;
  await expect(service.create(principal, input)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' }); expect(create).not.toHaveBeenCalled();
});
it('patch preserva campos omitidos e permite limpar e-mail/tags', async () => {
  const { service, principal, row } = fixture(); row.notes = 'Preservar'; row.email = 'old@example.invalid';
  const result = await service.update(principal, row.id, { email: null, tags: [] });
  expect(result.email).toBeNull(); expect(result.notes).toBe('Preservar'); expect(result.tags).toEqual([]);
});
it('arquivo é idempotente e não permite edição posterior', async () => {
  const { service, principal, row, archive } = fixture(); await service.archive(principal, row.id); row.isArchived = true;
  await service.archive(principal, row.id); expect(archive).toHaveBeenCalledTimes(1);
  await expect(service.update(principal, row.id, { name: 'Novo' })).rejects.toMatchObject({ code: 'CONTACT_ARCHIVED' });
});
it('consulta de alvo inexistente retorna erro controlado', async () => {
  const { service, principal, context } = fixture(); context.target = null;
  await expect(service.get(principal, 'missing')).rejects.toMatchObject({ code: 'CONTACT_NOT_FOUND' });
});
