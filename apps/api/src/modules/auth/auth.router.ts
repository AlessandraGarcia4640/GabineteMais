import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { loginRequestSchema, logoutRequestSchema, refreshRequestSchema } from '@gabinete-plus/shared';
import type { LoginService } from './auth.service.js';

function createLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Muitas tentativas. Tente novamente mais tarde.' } },
  });
}

export function createAuthRouter(service: LoginService): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/login', createLimiter(20), async (request, response) => {
    const input = loginRequestSchema.parse(request.body);
    response.status(200).json(await service.login(input));
  });
  router.post('/refresh', createLimiter(60), async (request, response) => {
    const input = refreshRequestSchema.parse(request.body);
    response.status(200).json(await service.refresh(input));
  });
  router.post('/logout', createLimiter(120), async (request, response) => {
    const input = logoutRequestSchema.parse(request.body);
    await service.logout(input);
    response.status(204).end();
  });
  return router;
}
