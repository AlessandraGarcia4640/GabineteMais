import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('gera hash Argon2id e valida a senha correta', () => {
    const hash = hashPassword('Gabinete+2026!');

    expect(hash.startsWith('argon2id$')).toBe(true);
    expect(verifyPassword(hash, 'Gabinete+2026!')).toBe(true);
  });

  it('rejeita senha incorreta', () => {
    const hash = hashPassword('Gabinete+2026!');

    expect(verifyPassword(hash, 'senha-incorreta')).toBe(false);
  });
});
