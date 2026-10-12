import {
  authTokensSchema,
  authUserSchema,
  loginResponseSchema,
} from '@gabinete-plus/shared';
import request from 'supertest';
import { z } from 'zod';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();
const password = 'Gabinete+2026!';
const activeEmail = 'teste.ativo@gabinete.local';
const inactiveEmail = 'teste.inativo@gabinete.local';

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

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

    const rawBody: unknown = response.body;
    const body = loginResponseSchema.parse(rawBody);

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({
      email: activeEmail,
      role: 'CHEFE',
    });
    expect(body.tokens.accessToken).toEqual(expect.any(String));
    expect(body.tokens.refreshToken).toEqual(expect.any(String));
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

    const wrongBody = errorResponseSchema.parse(wrongPassword.body as unknown);
    const unknownBody = errorResponseSchema.parse(unknownUser.body as unknown);

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongBody.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownBody.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('bloqueia usuário inativo', async () => {
    await createUser(inactiveEmail, false);

    const response = await request(app).post('/auth/login').send({
      email: inactiveEmail,
      password,
    });

    const body = errorResponseSchema.parse(response.body as unknown);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('USER_INACTIVE');
  });

  it('protege /auth/me e retorna o usuário autenticado', async () => {
    const createdUser = await createUser(activeEmail);

    const unauthorized = await request(app).get('/auth/me');
    expect(unauthorized.status).toBe(401);

    const loginResponse = await request(app).post('/auth/login').send({
      email: activeEmail,
      password,
    });
    const loginBody = loginResponseSchema.parse(loginResponse.body as unknown);

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginBody.tokens.accessToken}`);

    const body = authUserSchema.parse(response.body as unknown);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: createdUser.id,
      email: activeEmail,
    });
  });

  it('rotaciona o refresh token e rejeita reutilização do token anterior', async () => {
    await createUser(activeEmail);

    const loginResponse = await request(app).post('/auth/login').send({
      email: activeEmail,
      password,
    });
    const loginBody = loginResponseSchema.parse(loginResponse.body as unknown);

    const refreshed = await request(app).post('/auth/refresh').send({
      refreshToken: loginBody.tokens.refreshToken,
    });
    const refreshedBody = authTokensSchema.parse(refreshed.body as unknown);

    expect(refreshed.status).toBe(200);
    expect(refreshedBody.accessToken).toEqual(expect.any(String));
    expect(refreshedBody.refreshToken).toEqual(expect.any(String));
    expect(refreshedBody.refreshToken).not.toBe(loginBody.tokens.refreshToken);

    const replay = await request(app).post('/auth/refresh').send({
      refreshToken: loginBody.tokens.refreshToken,
    });
    const replayBody = errorResponseSchema.parse(replay.body as unknown);

    expect(replay.status).toBe(401);
    expect(replayBody.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
  it('rejeita refresh token inválido', async () => {
    const response = await request(app).post('/auth/refresh').send({
      refreshToken: 'token-invalido',
    });
    const body = errorResponseSchema.parse(response.body as unknown);

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

});
