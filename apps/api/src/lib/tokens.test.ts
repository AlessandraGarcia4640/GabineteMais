import { describe, expect, it } from 'vitest';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokens.js';

describe('tokens', () => {
  it('emite e valida access token com perfil', () => {
    const token = signAccessToken('user-1', 'CHEFE');
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('CHEFE');
  });

  it('emite e valida refresh token', () => {
    const token = signRefreshToken('user-1');
    const payload = verifyRefreshToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.tokenType).toBe('refresh');
  });

  it('gera hash estável para persistência do refresh token', () => {
    expect(hashToken('token')).toBe(hashToken('token'));
    expect(hashToken('token')).not.toBe(hashToken('outro-token'));
  });
});
