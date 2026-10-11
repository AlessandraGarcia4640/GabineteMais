import request from 'supertest';
import { jwtVerify } from 'jose';
import { expect, it, vi } from 'vitest';
import { apiErrorSchema, loginResponseSchema } from '@gabinete-plus/shared';
import { createApp } from '../../app.js';
import { hashPassword } from '../users/password.js';
import { LoginService } from './auth.service.js';
import { createAccessTokenIssuer } from './access-token.js';
import { MemorySessions } from './memory-session.test-helper.js';
import { createRefreshToken, hashRefreshToken } from './refresh-token.js';

const password = 'Senha-ficticia-sessoes-25';
const secret = 'segredo-ficticio-somente-para-sessoes-25';

async function fixture() {
  const user = { id: 'session-user', name: 'Pessoa Fictícia', email: 'session@example.invalid',
    role: 'ASSESSOR', isActive: true, passwordHash: await hashPassword(password) };
  const sessions = new MemorySessions({ ...user, role: 'ASSESSOR' });
  const issueToken = vi.fn(createAccessTokenIssuer(secret));
  const service = new LoginService({
    findUser: () => Promise.resolve({ ...user, role: 'ASSESSOR' }), issueToken, sessions,
  });
  const app = createApp(service);
  const login = () => service.login({ email: user.email, password });
  return { app, sessions, issueToken, service, login };
}

it('renova os dois tokens, preserva prazo e usa perfil atual', async () => {
  const { app, sessions, login } = await fixture();
  const original = await login();
  expect([...sessions.tokens.keys()]).toEqual([hashRefreshToken(original.refreshToken)]);
  expect([...sessions.tokens.keys()]).not.toContain(original.refreshToken);
  sessions.user = { ...sessions.user, role: 'CHEFE' };
  const response = await request(app).post('/auth/refresh').send({ refreshToken: original.refreshToken });
  expect(response.status).toBe(200);
  const renewed = loginResponseSchema.parse(response.body);
  expect(renewed.refreshToken).not.toBe(original.refreshToken);
  expect(renewed.accessToken).not.toBe(original.accessToken);
  expect(renewed.refreshExpiresAt).toBe(original.refreshExpiresAt);
  expect(renewed.user.role).toBe('CHEFE');
  expect(response.headers['cache-control']).toBe('no-store');
  const first = await jwtVerify(original.accessToken, new TextEncoder().encode(secret));
  const second = await jwtVerify(renewed.accessToken, new TextEncoder().encode(secret));
  expect(second.payload.sid).toBe(first.payload.sid);
  expect(second.payload.role).toBe('CHEFE');
});

it('revoga a sessão inteira ao reutilizar um token consumido', async () => {
  const { service, login } = await fixture();
  const original = await login();
  const renewed = await service.refresh({ refreshToken: original.refreshToken });
  await expect(service.refresh({ refreshToken: original.refreshToken })).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  await expect(service.refresh({ refreshToken: renewed.refreshToken })).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
});

it.each(['expired', 'inactive', 'revoked', 'unknown'])('nega token %s sem emitir acesso', async (scenario) => {
  const { app, sessions, issueToken, login } = await fixture();
  const original = await login();
  const session = [...sessions.sessions.values()][0];
  if (!session) throw new Error('Sessão não criada.');
  if (scenario === 'expired') session.expiresAt = new Date(Date.now() - 1);
  if (scenario === 'inactive') sessions.user = { ...sessions.user, isActive: false };
  if (scenario === 'revoked') session.revokedAt = new Date();
  const response = await request(app).post('/auth/refresh').send({
    refreshToken: scenario === 'unknown' ? createRefreshToken() : original.refreshToken,
  });
  expect(response.status).toBe(401);
  expect(apiErrorSchema.parse(response.body).error.code).toBe('INVALID_REFRESH_TOKEN');
  expect(issueToken).toHaveBeenCalledTimes(1);
  if (scenario !== 'unknown') expect(session.revokedAt).not.toBeNull();
});

it('logout é idempotente e preserva outras sessões do usuário', async () => {
  const { app, service, login } = await fixture();
  const first = await login();
  const second = await login();
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request(app).post('/auth/logout').send({ refreshToken: first.refreshToken });
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  }
  expect((await request(app).post('/auth/logout').send({ refreshToken: createRefreshToken() })).status).toBe(204);
  await expect(service.refresh({ refreshToken: first.refreshToken })).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  expect((await service.refresh({ refreshToken: second.refreshToken })).user.id).toBe(first.user.id);
});

it('logout com token antigo também revoga o token atual da sessão', async () => {
  const { service, login } = await fixture();
  const original = await login();
  const renewed = await service.refresh({ refreshToken: original.refreshToken });
  await service.logout({ refreshToken: original.refreshToken });
  await expect(service.refresh({ refreshToken: renewed.refreshToken })).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
});

it('serializa refresh concorrente e revoga a família em caso de replay', async () => {
  const { service, login } = await fixture();
  const original = await login();
  const results = await Promise.allSettled([
    service.refresh({ refreshToken: original.refreshToken }), service.refresh({ refreshToken: original.refreshToken }),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  for (const result of results) if (result.status === 'fulfilled') {
    await expect(service.refresh({ refreshToken: result.value.refreshToken })).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  }
});

it.each(['/auth/refresh', '/auth/logout'])('valida entrada em %s', async (endpoint) => {
  const { app } = await fixture();
  const response = await request(app).post(endpoint).send({ refreshToken: 'inválido', userId: 'outro-usuário' });
  expect(response.status).toBe(400);
  expect(apiErrorSchema.parse(response.body).error.code).toBe('VALIDATION_ERROR');
});
