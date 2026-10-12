import { contactFixture } from './fixtures.test-helper';
import { contactChanges, contactFormSchema, contactPayload, initialContactValues } from './model';
it('valida nome, instituição, e-mail e telefone no contrato compartilhado', () => {
  const values = initialContactValues(); expect(contactFormSchema.safeParse(values).success).toBe(false); values.name = 'Pessoa'; values.organization = 'Órgão'; values.email = 'email inválido';
  expect(contactFormSchema.safeParse(values).success).toBe(false); values.email = ''; values.phones = [{ text: '123' }]; expect(contactFormSchema.safeParse(values).success).toBe(false);
  values.phones = [{ text: '(51) 3333-4444 ramal 12' }]; expect(contactFormSchema.safeParse(values).success).toBe(true);
});
it('normaliza etiquetas e e-mail sem dividir conteúdo multiline', () => {
  const values = initialContactValues(contactFixture()); values.email = ' SECRETARIA@example.invalid '; values.tags = [{ text: ' Secretaria ' }, { text: 'SECRETARIA' }];
  const payload = contactPayload(values); expect(payload.tags).toEqual(['secretaria']); expect(payload.email).toBe('secretaria@example.invalid'); expect(payload.notes).toBe('Contato fictício\nOrientação de atendimento.');
});
it('edição envia somente mudanças e permite limpar opcionais explicitamente', () => {
  const original = contactFixture(); const values = initialContactValues(original); expect(contactChanges(original, contactPayload(values))).toBeNull();
  values.email = ''; values.phones = []; values.tags = []; expect(contactChanges(original, contactPayload(values))).toEqual({ email: null, phones: [], tags: [] });
});
it('valida limites de coleções, mantendo etiquetas como valores individuais', () => {
  const values = initialContactValues(contactFixture()); values.phones = Array.from({ length: 11 }, () => ({ text: '(51) 3333-4444' })); expect(contactFormSchema.safeParse(values).success).toBe(false);
  values.phones = []; values.tags = Array.from({ length: 21 }, (_, index) => ({ text: `etiqueta-${String(index)}` })); expect(contactFormSchema.safeParse(values).success).toBe(false);
  values.tags = [{ text: 'a'.repeat(41) }]; expect(contactFormSchema.safeParse(values).success).toBe(false);
});
