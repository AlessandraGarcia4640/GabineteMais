import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { apiErrorSchema, loginResponseSchema } from '@gabinete-plus/shared';
import { createApp } from '../../app.js';
import { hashPassword } from '../users/password.js';
import { createAccessTokenIssuer } from './access-token.js';
import { LoginService } from './auth.service.js';
import type { CredentialUser } from './auth.repository.js';

const password = 'Senha-ficticia-login-24';
const testSecret = 'segredo-ficticio-somente-para-testes-24';

async function fixture(isActive = true, exists = true) {
  const candidate: CredentialUser = {
    id: 'assessor-test', name: 'Pessoa Fictícia', email: 'assessor@example.invalid',
    role: 'ASSESSOR', isActive, passwordHash: await hashPassword(password),
  };
  const findUser = vi.fn((email: string) => Promise.resolve(exists && email === candidate.email ? candidate : null));
  const issueToken = vi.fn(createAccessTokenIssuer(testSecret));
  return { app: createApp(new LoginService({ findUser, issueToken })), findUser, issueToken };
}

describe('POST /auth/login', () => {
  it('autentica e retorna somente informações públicas', async () => {
    const { app } = await fixture();
    const response = await request(app).post('/auth/login').send({ email: ' assessor@example.invalid ', password });
    expect(response.status).toBe(200);
    const result = loginResponseSchema.parse(response.body);
    expect(result.user.role).toBe('ASSESSOR');
    expect(result.expiresIn).toBe(900);
    expect(response.text).not.toContain('passwordHash');
    expect(response.text).not.toContain(password);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(['senha-incorreta', 'conta-inexistente', 'conta-desativada'])(
    'nega %s com a mesma resposta e sem emitir token', async (scenario) => {
      const { app, issueToken } = await fixture(scenario !== 'conta-desativada', scenario !== 'conta-inexistente');
      const response = await request(app).post('/auth/login').send({
        email: 'assessor@example.invalid', password: scenario === 'senha-incorreta' ? 'Senha-incorreta-24' : password,
      });
      expect(response.status).toBe(401);
      expect(apiErrorSchema.parse(response.body)).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' },
      });
      expect(issueToken).not.toHaveBeenCalled();
    },
  );

  it.each([
    { email: 'inválido', password },
    { email: 'assessor@example.invalid', password: '' },
    { email: 'assessor@example.invalid', password, role: 'CHEFE' },
    { email: 'assessor@example.invalid' },
  ])('valida a entrada antes de consultar o banco', async (input) => {
    const { app, findUser } = await fixture();
    const response = await request(app).post('/auth/login').send(input);
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('VALIDATION_ERROR');
    expect(findUser).not.toHaveBeenCalled();
  });

  it('trata JSON malformado como erro de entrada', async () => {
    const { app, findUser } = await fixture();
    const response = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('INVALID_JSON');
    expect(findUser).not.toHaveBeenCalled();
  });

  it('limita a 20 tentativas por IP sem bloquear a rota de saúde', async () => {
    const { app, findUser } = await fixture(true, false);
    for (let attempt = 0; attempt < 20; attempt++) {
      expect((await request(app).post('/auth/login').send({ email: 'assessor@example.invalid', password })).status).toBe(401);
    }
    const limited = await request(app).post('/auth/login').send({ email: 'assessor@example.invalid', password });
    expect(limited.status).toBe(429);
    expect(apiErrorSchema.parse(limited.body).error.code).toBe('AUTH_RATE_LIMITED');
    expect(findUser).toHaveBeenCalledTimes(20);
    expect((await request(app).get('/health')).status).toBe(200);
  });
});
