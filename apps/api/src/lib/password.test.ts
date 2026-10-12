import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('gera hash Argon2id e valida a senha correta', async () => {
    const hash = await hashPassword('Gabinete+2026!');

    expect(hash.startsWith('argon2id$')).toBe(true);
    await expect(verifyPassword(hash, 'Gabinete+2026!')).resolves.toBe(true);
  });

  it('rejeita senha incorreta', async () => {
    const hash = await hashPassword('Gabinete+2026!');

    await expect(verifyPassword(hash, 'senha-incorreta')).resolves.toBe(false);
  });
});
