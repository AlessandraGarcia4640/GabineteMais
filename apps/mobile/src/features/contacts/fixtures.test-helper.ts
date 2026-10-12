import { contactSchema, type Contact } from '@gabinete-plus/shared';
export function contactFixture(input: Partial<Contact> = {}): Contact {
  return contactSchema.parse({ id: 'contact-1', name: 'Secretaria Fictícia', organization: 'Tribunal de Demonstração', jobTitle: 'Secretaria', phones: ['(51) 3333-4444 ramal 12'], email: 'secretaria@example.invalid',
    notes: 'Contato fictício\nOrientação de atendimento.', tags: ['secretaria'], isKeyContact: true, isArchived: false, createdById: 'actor', updatedById: 'actor', createdAt: '2026-10-12T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z', ...input });
}
