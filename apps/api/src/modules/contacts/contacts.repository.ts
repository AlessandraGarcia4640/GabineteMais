import type { ContactListQuery, CreateContact, UserSummary } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';
import type { Contact as StoredContact } from '../../generated/prisma/client.js';
import type { SessionSnapshot } from '../auth/session.repository.js';
export type { Contact as StoredContact } from '../../generated/prisma/client.js';

function data(input: CreateContact) { return { ...input, searchText: [input.name, input.organization, ...input.tags].join(' ') }; }
export interface ContactMutation {
  actor: UserSummary | null; session: SessionSnapshot | null; target: StoredContact | null;
  create: (input: CreateContact) => Promise<StoredContact>;
  update: (id: string, input: CreateContact) => Promise<StoredContact>;
  archive: (id: string) => Promise<void>;
}
export interface ContactsRepository {
  find: (id: string) => Promise<StoredContact | null>;
  list: (query: ContactListQuery) => Promise<StoredContact[]>;
  withActor: <T>(actorId: string, sessionId: string, targetId: string | null, operation: (context: ContactMutation) => Promise<T>) => Promise<T>;
}
export const contactsRepository: ContactsRepository = {
  find: (id) => prisma.contact.findUnique({ where: { id } }),
  list: (query) => prisma.contact.findMany({ where: { isArchived: query.isArchived,
    ...(query.cursor ? { id: { gt: query.cursor } } : {}), ...(query.q ? { searchText: { contains: query.q, mode: 'insensitive' } } : {}),
    ...(query.organization ? { organization: { equals: query.organization, mode: 'insensitive' } } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}), ...(query.isKeyContact !== undefined ? { isKeyContact: query.isKeyContact } : {}),
  }, orderBy: { id: 'asc' }, take: query.limit + 1 }),
  withActor(actorId, sessionId, targetId, operation) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${actorId} FOR UPDATE`;
      if (targetId) await transaction.$queryRaw`SELECT "id" FROM "contacts" WHERE "id" = ${targetId} FOR UPDATE`;
      const actor = await transaction.user.findUnique({ where: { id: actorId }, select: { id: true, name: true, email: true, role: true, isActive: true } });
      const session = await transaction.authSession.findUnique({ where: { id: sessionId }, select: { id: true, expiresAt: true, revokedAt: true,
        user: { select: { id: true, name: true, email: true, role: true, isActive: true } } } });
      const target = targetId ? await transaction.contact.findUnique({ where: { id: targetId } }) : null;
      return operation({ actor, session, target,
        create: (input) => transaction.contact.create({ data: { ...data(input), createdById: actorId, updatedById: actorId } }),
        update: (id, input) => transaction.contact.update({ where: { id }, data: { ...data(input), updatedById: actorId } }),
        async archive(id) { await transaction.contact.update({ where: { id }, data: { isArchived: true, updatedById: actorId } }); },
      });
    });
  },
};
export async function seedDemoContacts(): Promise<void> {
  const actor = await prisma.user.findUnique({ where: { email: 'chefia@example.invalid' }, select: { id: true } });
  if (!actor) throw new Error('Prepare usuários fictícios antes dos contatos.');
  const examples: { id: string; input: CreateContact }[] = [
    { id: 'demo-contact-secretaria', input: { name: 'Secretaria Fictícia', organization: 'Tribunal de Demonstração', jobTitle: 'Secretaria', phones: [],
      email: 'secretaria@example.invalid', notes: 'Contato fictício para demonstração.', tags: ['sessões', 'secretaria'], isKeyContact: true } },
    { id: 'demo-contact-suporte', input: { name: 'Suporte Fictício', organization: 'Órgão de Demonstração', jobTitle: 'Suporte técnico', phones: [],
      email: 'suporte@example.invalid', notes: 'Sem canal real de atendimento.', tags: ['suporte', 'tecnologia'], isKeyContact: false } },
  ];
  await prisma.$transaction(examples.map(({ id, input }) => prisma.contact.upsert({ where: { id }, update: {},
    create: { id, ...data(input), createdById: actor.id, updatedById: actor.id } })));
}
