import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { loginRequestSchema } from '@gabinete-plus/shared';
import type { LoginService } from './auth.service.js';

export function createAuthRouter(service: LoginService): Router {
  const router = Router();
  router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Muitas tentativas. Tente novamente mais tarde.' } },
  }));
  router.post('/login', async (request, response) => {
    const input = loginRequestSchema.parse(request.body);
    response.set('Cache-Control', 'no-store');
    response.status(200).json(await service.login(input));
  });
  return router;
}
