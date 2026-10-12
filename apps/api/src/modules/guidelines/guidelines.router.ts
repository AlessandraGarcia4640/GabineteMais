import { Router } from 'express';
import { createGuidelineSchema, updateGuidelineSchema, guidelineListQuerySchema, guidelineHistoryQuerySchema, guidelineVersionParamsSchema, userIdParamsSchema, emptyQuerySchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { GuidelinesService } from './guidelines.service.js';
export function createGuidelinesRouter(authorization: AuthorizationService, service: GuidelinesService): Router {
  const router = Router(); router.use(requireAuth(authorization));
  router.get('/', async (req, res) => { res.json(await service.list(principalFor(req), guidelineListQuerySchema.parse(req.query))); });
  router.post('/', async (req, res) => { emptyQuerySchema.parse(req.query); const result = await service.create(principalFor(req), createGuidelineSchema.parse(req.body)); res.location(`/guidelines/${result.id}`).status(201).json(result); });
  router.get('/:id/versions', async (req, res) => { const { id } = userIdParamsSchema.parse(req.params); res.json(await service.history(principalFor(req), id, guidelineHistoryQuerySchema.parse(req.query))); });
  router.get('/:id/versions/:version', async (req, res) => { emptyQuerySchema.parse(req.query); const { id, version } = guidelineVersionParamsSchema.parse(req.params); res.json(await service.version(principalFor(req), id, version)); });
  router.get('/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.get(principalFor(req), id)); });
  router.patch('/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.update(principalFor(req), id, updateGuidelineSchema.parse(req.body))); });
  router.delete('/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); await service.archive(principalFor(req), id); res.status(204).end(); });
  return router;
}
