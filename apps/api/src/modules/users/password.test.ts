import { expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

it('gera Argon2id com salt distinto e rejeita senha incorreta', async () => {
  const password = 'Senha-ficticia-para-teste';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  expect(first).toMatch(/^\$argon2id\$/);
  expect(first).not.toBe(second);
  expect(await verifyPassword(first, password)).toBe(true);
  expect(await verifyPassword(first, 'senha-incorreta')).toBe(false);
});
