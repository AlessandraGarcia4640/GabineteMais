import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { signAccessToken } from '../lib/tokens.js';
import { requireAuth, requireRole } from './auth.js';

const createTestApp = () => {
  const app = express();

  app.get('/protected', requireAuth, (req, res) => {
    res.json(req.auth);
  });

  app.get('/chief-only', requireAuth, requireRole('CHEFE'), (_req, res) => {
    res.json({ ok: true });
  });

  return app;
};

describe('auth middleware', () => {
  it('rejeita requisição sem token', async () => {
    const response = await request(createTestApp()).get('/protected');
    expect(response.status).toBe(401);
  });

  it('aceita access token válido', async () => {
    const token = await signAccessToken('user-1', 'ASSESSOR');
    const response = await request(createTestApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      userId: 'user-1',
      role: 'ASSESSOR',
    });
  });

  it('aplica RBAC', async () => {
    const assessor = await signAccessToken('user-1', 'ASSESSOR');
    const chefe = await signAccessToken('user-2', 'CHEFE');

    const denied = await request(createTestApp())
      .get('/chief-only')
      .set('Authorization', `Bearer ${assessor}`);

    const allowed = await request(createTestApp())
      .get('/chief-only')
      .set('Authorization', `Bearer ${chefe}`);

    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
  });
});
