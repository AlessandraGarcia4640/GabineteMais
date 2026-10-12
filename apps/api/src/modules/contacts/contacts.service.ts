import { contactPageSchema, contactSchema, createContactSchema, type Contact, type ContactListQuery, type ContactPage, type CreateContact, type UpdateContact } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import type { ContactMutation, ContactsRepository, StoredContact } from './contacts.repository.js';
function payload(row: StoredContact): CreateContact {
  return { name: row.name, organization: row.organization, jobTitle: row.jobTitle, phones: row.phones, email: row.email, notes: row.notes, tags: row.tags, isKeyContact: row.isKeyContact };
}
function view(row: StoredContact): Contact { return contactSchema.parse({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }); }
function missing(): AppError { return new AppError('CONTACT_NOT_FOUND', 'Contato não encontrado.', 404); }
export class ContactsService {
  constructor(private readonly authorization: AuthorizationService, private readonly repository: ContactsRepository) {}
  private authorize(principal: SessionPrincipal, context: ContactMutation): void {
    if (!context.actor || !context.session) throw unauthenticated();
    if (context.actor.id !== principal.user.id || context.session.id !== principal.sessionId || context.session.user.id !== principal.user.id
      || context.session.revokedAt || context.session.expiresAt <= new Date()) throw unauthenticated();
    this.authorization.requirePermission({ ...principal, user: context.actor, expiresAt: context.session.expiresAt }, 'contacts:manage');
  }
  async list(principal: SessionPrincipal, query: ContactListQuery): Promise<ContactPage> {
    this.authorization.requirePermission(principal, 'contacts:read');
    const rows = await this.repository.list(query); const visible = rows.slice(0, query.limit);
    return contactPageSchema.parse({ items: visible.map(view), nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }
  async get(principal: SessionPrincipal, id: string): Promise<Contact> {
    this.authorization.requirePermission(principal, 'contacts:read');
    const row = await this.repository.find(id); if (!row) throw missing(); return view(row);
  }
  async create(principal: SessionPrincipal, input: CreateContact): Promise<Contact> {
    this.authorization.requirePermission(principal, 'contacts:manage');
    return this.repository.withActor(principal.user.id, principal.sessionId, null, async (context) => {
      this.authorize(principal, context); return view(await context.create(createContactSchema.parse(input)));
    });
  }
  async update(principal: SessionPrincipal, id: string, input: UpdateContact): Promise<Contact> {
    this.authorization.requirePermission(principal, 'contacts:manage');
    return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorize(principal, context); if (!context.target) throw missing();
      if (context.target.isArchived) throw new AppError('CONTACT_ARCHIVED', 'Contato arquivado não pode ser editado.', 409);
      return view(await context.update(id, createContactSchema.parse({ ...payload(context.target), ...input })));
    });
  }
  async archive(principal: SessionPrincipal, id: string): Promise<void> {
    this.authorization.requirePermission(principal, 'contacts:manage');
    await this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorize(principal, context); if (!context.target) throw missing(); if (!context.target.isArchived) await context.archive(id);
    });
  }
}
