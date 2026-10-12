import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();
const password = 'Gabinete+2026!';
const activeEmail = 'teste.ativo@gabinete.local';
const inactiveEmail = 'teste.inativo@gabinete.local';

const createUser = async (
  email: string,
  isActive = true,
  role: 'CHEFE' | 'ASSESSOR' | 'APOIO' = 'ASSESSOR',
) =>
  prisma.user.create({
    data: {
      name: isActive ? 'Usuário Teste' : 'Usuário Inativo',
      email,
      passwordHash: hashPassword(password),
      role,
      isActive,
    },
  });

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [activeEmail, inactiveEmail],
      },
    },
  });
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [activeEmail, inactiveEmail],
      },
    },
  });
  await prisma.$disconnect();
});

describe('RF00 auth endpoints', () => {
  it('autentica usuário ativo e retorna tokens', async () => {
    await createUser(activeEmail, true, 'CHEFE');

    const response = await request(app).post('/auth/login').send({
      email: activeEmail,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: activeEmail,
      role: 'CHEFE',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.tokens.refreshToken).toEqual(expect.any(String));
  });

  it('não revela se o erro foi e-mail inexistente ou senha incorreta', async () => {
    await createUser(activeEmail);

    const wrongPassword = await request(app).post('/auth/login').send({
      email: activeEmail,
      password: 'SenhaErrada123!',
    });

    const unknownUser = await request(app).post('/auth/login').send({
      email: 'naoexiste@gabinete.local',
      password,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('bloqueia usuário inativo', async () => {
    await createUser(inactiveEmail, false);

    const response = await request(app).post('/auth/login').send({
      email: inactiveEmail,
      password,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('USER_INACTIVE');
  });

  it('protege /auth/me e retorna o usuário autenticado', async () => {
    await createUser(activeEmail);

    const unauthorized = await request(app).get('/auth/me');
    expect(unauthorized.status).toBe(401);

    const login = await request(app).post('/auth/login').send({
      email: activeEmail,
      password,
    });

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(activeEmail);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rotaciona o refresh token e rejeita reutilização do token anterior', async () => {
    await createUser(activeEmail);

    const login = await request(app).post('/auth/login').send({
      email: activeEmail,
      password,
    });

    const oldRefreshToken = login.body.tokens.refreshToken as string;

    const refreshed = await request(app).post('/auth/refresh').send({
      refreshToken: oldRefreshToken,
    });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toEqual(expect.any(String));

    const replay = await request(app).post('/auth/refresh').send({
      refreshToken: oldRefreshToken,
    });

    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});
