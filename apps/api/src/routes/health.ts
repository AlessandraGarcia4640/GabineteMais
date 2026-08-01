import { Router } from 'express';
import { healthResponseSchema } from '@gabinete-plus/shared';

export const healthRouter = Router();
healthRouter.get('/', (_request, response) => {
  const payload = healthResponseSchema.parse({ status: 'ok', service: 'gabinete-plus-api', timestamp: new Date().toISOString() });
  response.status(200).json(payload);
});
