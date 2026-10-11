import { jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { ACCESS_TOKEN_AUDIENCE, ACCESS_TOKEN_ISSUER, createAccessTokenIssuer } from './access-token.js';

const secret = 'segredo-ficticio-somente-para-token-24';
const key = new TextEncoder().encode(secret);
const actor = { id: 'user-test', name: 'Pessoa Fictícia', email: 'user@example.invalid', role: 'ASSESSOR', isActive: true };

describe('token de acesso', () => {
  it('assina identidade e perfil com validade de 15 minutos', async () => {
    const token = await createAccessTokenIssuer(secret)({ ...actor, role: 'ASSESSOR' });
    const { payload, protectedHeader } = await jwtVerify(token, key, {
      algorithms: ['HS256'], issuer: ACCESS_TOKEN_ISSUER, audience: ACCESS_TOKEN_AUDIENCE,
    });
    expect(protectedHeader).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(payload.sub).toBe(actor.id);
    expect(payload.role).toBe('ASSESSOR');
    expect(payload).not.toHaveProperty('email');
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') throw new Error('Token sem datas.');
    expect(payload.exp - payload.iat).toBe(900);
    await expect(jwtVerify(token, key, { currentDate: new Date((payload.exp + 1) * 1000) })).rejects.toThrow();
    await expect(jwtVerify(token, key, { audience: 'outro-aplicativo' })).rejects.toThrow();
    await expect(jwtVerify(token, key, { issuer: 'outro-emissor' })).rejects.toThrow();
    await expect(jwtVerify(token, key, { algorithms: ['HS512'] })).rejects.toThrow();
  });

  it('rejeita assinatura adulterada ou chave diferente', async () => {
    const token = await createAccessTokenIssuer(secret)({ ...actor, role: 'ASSESSOR' });
    await expect(jwtVerify(token + 'x', key)).rejects.toThrow();
    await expect(jwtVerify(token, new TextEncoder().encode('outro-segredo-ficticio-para-token-24'))).rejects.toThrow();
  });

  it('não aceita chave curta', () => {
    expect(() => createAccessTokenIssuer('curta')).toThrow();
  });
});
