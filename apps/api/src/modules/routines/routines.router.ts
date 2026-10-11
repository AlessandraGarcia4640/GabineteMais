import { Router } from 'express';
import { createRoutineSchema, emptyQuerySchema, routineListQuerySchema, updateRoutineSchema, userIdParamsSchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth, requireRole } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { RoutinesService } from './routines.service.js';

export function createRoutinesRouter(authorization: AuthorizationService, service: RoutinesService): Router {
  const router = Router();
  router.use(requireAuth(authorization));
  router.get('/', async (request, response) => {
    response.status(200).json(await service.list(principalFor(request), routineListQuerySchema.parse(request.query)));
  });
  router.post('/', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const routine = await service.create(principalFor(request), createRoutineSchema.parse(request.body));
    response.location(`/routines/${routine.id}`).status(201).json(routine);
  });
  router.get('/:id', async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await service.get(principalFor(request), id));
  });
  router.patch('/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await service.update(principalFor(request), id, updateRoutineSchema.parse(request.body)));
  });
  router.delete('/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    await service.archive(principalFor(request), id);
    response.status(204).end();
  });
  return router;
}
