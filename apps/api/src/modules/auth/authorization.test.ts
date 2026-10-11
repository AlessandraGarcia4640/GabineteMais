import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { apiErrorSchema, currentAccessSchema, userPermissionsSchema, type UserRole } from '@gabinete-plus/shared';
import { createApp } from '../../app.js';
import { hashPassword } from '../users/password.js';
import { UserAccessService } from '../users/user-access.service.js';
import { ACCESS_TOKEN_AUDIENCE, ACCESS_TOKEN_ISSUER, createAccessTokenIssuer, createAccessTokenVerifier } from './access-token.js';
import { AuthorizationService } from './authorization.service.js';
import { LoginService } from './auth.service.js';
import { MemorySessions } from './memory-session.test-helper.js';

const password = 'Senha-ficticia-RBAC-26';
const secret = 'segredo-ficticio-RBAC-26-somente-testes-'.repeat(3);

async function fixture(role: UserRole = 'CHEFE') {
  const user = { id: 'access-user', name: 'Pessoa Fictícia', email: 'access@example.invalid', role, isActive: true };
  const candidate = { ...user, passwordHash: await hashPassword(password) };
  const sessions = new MemorySessions(user);
  const login = new LoginService({ findUser: () => Promise.resolve(candidate), issueToken: createAccessTokenIssuer(secret), sessions });
  const sessionLookup = vi.fn((id: string) => sessions.findSession(id));
  const authorization = new AuthorizationService({ verifyToken: createAccessTokenVerifier(secret), findSession: sessionLookup });
  const userLookup = vi.fn((id: string) => Promise.resolve(id === user.id ? sessions.user : null));
  const app = createApp(login, authorization, userLookup);
  const credentials = await login.login({ email: user.email, password });
  const sessionId = [...sessions.sessions.keys()][0];
  if (!sessionId) throw new Error('Sessão não criada.');
  return { user, app, login, sessions, sessionId, authorization, sessionLookup, userLookup, credentials };
}

it.each(['CHEFE', 'ASSESSOR', 'APOIO'])('permite consultar o próprio acesso como %s', async (role) => {
  const { app, credentials } = await fixture(role === 'CHEFE' ? 'CHEFE' : role === 'ASSESSOR' ? 'ASSESSOR' : 'APOIO');
  const response = await request(app).get('/auth/me').set('Authorization', `bEaReR ${credentials.accessToken}`);
  expect(response.status).toBe(200);
  const access = currentAccessSchema.parse(response.body);
  expect(access.user.role).toBe(role);
  expect(access.permissions).toContain('team:read');
  expect(access.permissions.includes('team:manage')).toBe(role === 'CHEFE');
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.text).not.toContain('passwordHash');
  expect(response.text).not.toContain(credentials.accessToken);
});

it.each(['CHEFE', 'ASSESSOR', 'APOIO'])('restringe consulta administrativa para %s', async (role) => {
  const { app, credentials, userLookup, user } = await fixture(role === 'CHEFE' ? 'CHEFE' : role === 'ASSESSOR' ? 'ASSESSOR' : 'APOIO');
  const response = await request(app).get(`/users/${user.id}/permissions`).set('Authorization', `Bearer ${credentials.accessToken}`);
  expect(response.status).toBe(role === 'CHEFE' ? 200 : 403);
  if (role === 'CHEFE') expect(userPermissionsSchema.parse(response.body).permissions).toContain('team:manage');
  else {
    expect(apiErrorSchema.parse(response.body).error.code).toBe('FORBIDDEN');
    expect(userLookup).not.toHaveBeenCalled();
  }
});

it('revalida perfil no banco, sem manter privilégios antigos do JWT', async () => {
  const { app, credentials, sessions, user } = await fixture();
  sessions.user = { ...sessions.user, role: 'ASSESSOR' };
  const self = await request(app).get('/auth/me').set('Authorization', `Bearer ${credentials.accessToken}`);
  expect(currentAccessSchema.parse(self.body).user.role).toBe('ASSESSOR');
  const denied = await request(app).get(`/users/${user.id}/permissions`).set('Authorization', `Bearer ${credentials.accessToken}`)
    .set('X-User-Role', 'CHEFE');
  expect(denied.status).toBe(403);
});

it('nega acesso imediatamente após logout', async () => {
  const { app, credentials, login } = await fixture();
  await login.logout({ refreshToken: credentials.refreshToken });
  const denied = await request(app).get('/auth/me').set('Authorization', `Bearer ${credentials.accessToken}`);
  expect(denied.status).toBe(401);
  expect(apiErrorSchema.parse(denied.body).error.code).toBe('UNAUTHENTICATED');
});

it('nega access token da família revogada por replay', async () => {
  const { app, credentials, login } = await fixture();
  const renewed = await login.refresh({ refreshToken: credentials.refreshToken });
  await expect(login.refresh({ refreshToken: credentials.refreshToken })).rejects.toThrow();
  expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${renewed.accessToken}`)).status).toBe(401);
});

it.each(['inactive', 'expired', 'missing'])('nega usuário ou sessão %s', async (scenario) => {
  const { app, credentials, sessions, sessionId } = await fixture();
  if (scenario === 'inactive') sessions.user = { ...sessions.user, isActive: false };
  if (scenario === 'missing') sessions.sessions.delete(sessionId);
  if (scenario === 'expired') {
    const session = sessions.sessions.get(sessionId);
    if (!session) throw new Error('Sessão não criada.');
    session.expiresAt = new Date(Date.now() - 1);
  }
  expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${credentials.accessToken}`)).status).toBe(401);
});

it.each(['missing', 'basic', 'malformed', 'tampered', 'query'])('rejeita autorização %s antes de consultar o banco', async (scenario) => {
  const { app, credentials, sessionLookup } = await fixture();
  let operation = request(app).get('/auth/me');
  if (scenario === 'basic') operation = operation.set('Authorization', 'Basic credenciais');
  if (scenario === 'malformed') operation = operation.set('Authorization', 'Bearer inválido');
  if (scenario === 'tampered') operation = operation.set('Authorization', `Bearer ${credentials.accessToken}x`);
  if (scenario === 'query') operation = operation.query({ access_token: credentials.accessToken });
  const response = await operation;
  expect(response.status).toBe(401);
  expect(response.headers['www-authenticate']).toBe('Bearer');
  expect(sessionLookup).not.toHaveBeenCalled();
});

it.each(['expired', 'future-iat', 'old-iat', 'wrong-issuer', 'wrong-audience', 'wrong-algorithm', 'wrong-type', 'missing-sid', 'missing-exp', 'wrong-subject', 'unknown-session'])(
  'nega JWT %s', async (scenario) => {
    const { app, user, sessionId } = await fixture();
    const now = Math.floor(Date.now() / 1000);
    const jwt = new SignJWT({ role: 'CHEFE', ...(scenario === 'missing-sid' ? {} : { sid: scenario === 'unknown-session' ? randomUUID() : sessionId }) })
      .setProtectedHeader({ alg: scenario === 'wrong-algorithm' ? 'HS512' : 'HS256', typ: scenario === 'wrong-type' ? 'refresh+jwt' : 'JWT' })
      .setSubject(scenario === 'wrong-subject' ? 'other-user' : user.id)
      .setIssuer(scenario === 'wrong-issuer' ? 'other-issuer' : ACCESS_TOKEN_ISSUER)
      .setAudience(scenario === 'wrong-audience' ? 'other-app' : ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt(scenario === 'future-iat' ? now + 60 : scenario === 'old-iat' ? now - 901 : now)
      .setJti(randomUUID());
    if (scenario !== 'missing-exp') jwt.setExpirationTime(scenario === 'expired' ? now - 1 : now + 900);
    const token = await jwt.sign(new TextEncoder().encode(secret));
    expect((await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  },
);

it('valida parâmetros e não revela usuário inexistente a perfis sem permissão', async () => {
  const chief = await fixture();
  const missing = await request(chief.app).get('/users/missing/permissions').set('Authorization', `Bearer ${chief.credentials.accessToken}`);
  expect(missing.status).toBe(404);
  const invalid = await request(chief.app).get('/auth/me').query({ role: 'CHEFE' }).set('Authorization', `Bearer ${chief.credentials.accessToken}`);
  expect(invalid.status).toBe(400);
  const assessor = await fixture('ASSESSOR');
  expect((await request(assessor.app).get('/users/missing/permissions').set('Authorization', `Bearer ${assessor.credentials.accessToken}`)).status).toBe(403);
  expect(assessor.userLookup).not.toHaveBeenCalled();
});

it('o service também nega gestão quando o middleware é contornado', async () => {
  const { authorization, credentials, userLookup, user } = await fixture('ASSESSOR');
  const principal = await authorization.authenticate(`Bearer ${credentials.accessToken}`);
  const service = new UserAccessService(authorization, { findUser: userLookup });
  await expect(service.permissions(principal, user.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(userLookup).not.toHaveBeenCalled();
});

it('falha fechada quando o banco está indisponível', async () => {
  const { app, credentials, sessionLookup } = await fixture();
  sessionLookup.mockRejectedValueOnce(new Error('Falha de banco fictícia'));
  const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const response = await request(app).get('/auth/me').set('Authorization', `Bearer ${credentials.accessToken}`);
    expect(response.status).toBe(500);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('INTERNAL_ERROR');
  } finally {
    logger.mockRestore();
  }
});
