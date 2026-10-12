import { Router } from 'express';
import { transitionQuerySchema, updateTransitionSchema, createTransitionSnapshotSchema, transitionSnapshotsQuerySchema, userIdParamsSchema, emptyQuerySchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { TransitionService } from './transition.service.js';
export function createTransitionRouter(authorization: AuthorizationService, service: TransitionService): Router {
  const router = Router(); router.use(requireAuth(authorization));
  router.get('/', async (req, res) => { res.json(await service.read(principalFor(req), transitionQuerySchema.parse(req.query))); });
  router.patch('/', async (req, res) => { emptyQuerySchema.parse(req.query); res.json(await service.update(principalFor(req), updateTransitionSchema.parse(req.body))); });
  router.get('/snapshots', async (req, res) => { res.json(await service.list(principalFor(req), transitionSnapshotsQuerySchema.parse(req.query))); });
  router.post('/snapshots', async (req, res) => { emptyQuerySchema.parse(req.query); const result = await service.create(principalFor(req), createTransitionSnapshotSchema.parse(req.body)); res.location(`/transition-guide/snapshots/${result.id}`).status(201).json(result); });
  router.get('/snapshots/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.get(principalFor(req), id)); });
  return router;
}
