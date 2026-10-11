import { expect, it } from 'vitest';
import { loginRequestSchema, positionHistorySchema, userSummarySchema } from './users.js';

it('remove campos privados do contrato público de usuário', () => {
  const result = userSummarySchema.parse({ id: '1', name: 'Teste', email: 'teste@example.invalid',
    role: 'CHEFE', isActive: true, passwordHash: 'privado' });
  expect(result).not.toHaveProperty('passwordHash');
});

it('rejeita perfil inexistente, e-mail inválido e senha vazia', () => {
  expect(userSummarySchema.safeParse({ id: '1', name: 'Teste', email: 'teste@example.invalid',
    role: 'SUBSTITUTO', isActive: true }).success).toBe(false);
  expect(loginRequestSchema.safeParse({ email: 'inválido', password: '' }).success).toBe(false);
});

it('rejeita período encerrado antes de começar', () => {
  expect(positionHistorySchema.safeParse({ id: '1', userId: '2', position: 'ASSESSOR', role: 'ASSESSOR',
    startedAt: '2026-10-11T12:00:00Z', endedAt: '2026-10-10T12:00:00Z' }).success).toBe(false);
});
