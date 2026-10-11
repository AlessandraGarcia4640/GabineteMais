import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { createUserSchema, roleForPosition, updateProfileSchema, userDetailSchema, userListQuerySchema } from './user-management.js';

it('normaliza cadastro e mantém perfis derivados do cargo', () => {
  const created = createUserSchema.parse({ name: ' Pessoa ', email: ' TEST@example.invalid ', password: 'Senha-ficticia-27', position: 'APOIO' });
  expect(created.email).toBe('test@example.invalid');
  expect(created.name).toBe('Pessoa');
  expect(roleForPosition('MAGISTRADO_GESTOR')).toBe('CHEFE');
  expect(roleForPosition('APOIO')).toBe('APOIO');
});

it('rejeita privilégio por payload, senha curta e paginação excessiva', () => {
  expect(createUserSchema.safeParse({ name: 'Pessoa', email: 'test@example.invalid', password: 'curta', position: 'APOIO' }).success).toBe(false);
  expect(updateProfileSchema.safeParse({ name: 'Pessoa', isActive: true }).success).toBe(false);
  expect(userListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
});

it('valida exemplo público sem expor dados privados', async () => {
  const example = userDetailSchema.parse(JSON.parse(await readFile(new URL('../../../openapi/examples/user-detail.json', import.meta.url), 'utf8')));
  expect(example.position).toBe('ASSESSOR');
  expect(example).not.toHaveProperty('passwordHash');
});
