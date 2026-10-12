import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { currentAccessSchema, permissionSchema, userPermissionsSchema } from './access.js';

it('mantém exemplo de acesso conforme o contrato e rejeita permissão desconhecida', async () => {
  const example = currentAccessSchema.parse(JSON.parse(await readFile(new URL('../../../openapi/examples/current-access.json', import.meta.url), 'utf8')));
  expect(example.user.role).toBe('ASSESSOR');
  expect(example.permissions).not.toContain('team:manage');
  expect(permissionSchema.safeParse('admin:all').success).toBe(false);
});

it('não devolve campos privados na consulta administrativa', () => {
  const permissions = userPermissionsSchema.parse({ userId: 'test', role: 'APOIO', isActive: false, permissions: [], passwordHash: 'privado' });
  expect(permissions).not.toHaveProperty('passwordHash');
});
