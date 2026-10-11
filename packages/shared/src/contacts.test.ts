import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { contactListQuerySchema, contactSchema, createContactSchema, updateContactSchema } from './contacts.js';
it('normaliza e-mail e tags sem perder formato de telefone', () => {
  const contact = createContactSchema.parse({ name: ' Pessoa ', organization: 'Órgão Fictício', email: ' PESSOA@example.invalid ',
    phones: ['+55 (41) 00000-0000'], tags: [' Externo ', 'externo'] });
  expect(contact.name).toBe('Pessoa'); expect(contact.email).toBe('pessoa@example.invalid');
  expect(contact.tags).toEqual(['externo']); expect(contact.phones[0]).toBe('+55 (41) 00000-0000');
});
it('rejeita e-mail/telefone inválidos, autoria externa e edição vazia', () => {
  const basic = { name: 'Pessoa', organization: 'Órgão' };
  expect(createContactSchema.safeParse({ ...basic, email: 'inválido' }).success).toBe(false);
  expect(createContactSchema.safeParse({ ...basic, phones: ['abc'] }).success).toBe(false);
  expect(createContactSchema.safeParse({ ...basic, createdById: 'outra-pessoa' }).success).toBe(false);
  expect(updateContactSchema.safeParse({}).success).toBe(false);
});
it('interpreta filtro false e limita paginação', () => {
  expect(contactListQuerySchema.parse({ isKeyContact: 'false' }).isKeyContact).toBe(false);
  expect(contactListQuerySchema.parse({}).isArchived).toBe(false);
  expect(contactListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
});
it('não expõe texto interno de busca', () => {
  const input = createContactSchema.parse({ name: 'Pessoa', organization: 'Órgão' });
  const result = contactSchema.parse({ ...input, id: 'contact', isArchived: false, createdById: 'actor', updatedById: 'actor',
    createdAt: '2026-10-11T12:00:00Z', updatedAt: '2026-10-11T12:00:00Z', searchText: 'interno' });
  expect(result).not.toHaveProperty('searchText');
});
it('mantém exemplo OpenAPI conforme o contrato público', async () => {
  const example = contactSchema.parse(JSON.parse(await readFile(new URL('../../../openapi/examples/contact.json', import.meta.url), 'utf8')));
  expect(example.isKeyContact).toBe(true); expect(example.email).toBe('secretaria@example.invalid');
});
