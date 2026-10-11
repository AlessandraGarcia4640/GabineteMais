import { Router } from 'express';
import { changePositionSchema, createUserSchema, emptyQuerySchema, historyQuerySchema, updateProfileSchema, userIdParamsSchema, userListQuerySchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth, requireRole } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { UserAccessService } from './user-access.service.js';
import type { ManagementService } from './management.service.js';

export function createUserAccessRouter(authorization: AuthorizationService, service: UserAccessService, management: ManagementService): Router {
  const router = Router();
  router.use(requireAuth(authorization));
  router.get('/', async (request, response) => {
    response.status(200).json(await management.list(principalFor(request), userListQuerySchema.parse(request.query)));
  });
  router.post('/', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const created = await management.create(principalFor(request), createUserSchema.parse(request.body));
    response.location(`/users/${created.id}`).status(201).json(created);
  });
  router.patch('/me', async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const principal = principalFor(request);
    response.status(200).json(await management.update(principal, principal.user.id, updateProfileSchema.parse(request.body), true));
  });
  router.get('/:id/positions', async (request, response) => {
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await management.history(principalFor(request), id, historyQuerySchema.parse(request.query)));
  });
  router.patch('/:id/position', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    const { position } = changePositionSchema.parse(request.body);
    response.status(200).json(await management.position(principalFor(request), id, position));
  });
  router.patch('/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await management.update(principalFor(request), id, updateProfileSchema.parse(request.body)));
  });
  router.delete('/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    await management.deactivate(principalFor(request), id);
    response.status(204).end();
  });
  router.get('/:id/permissions', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await service.permissions(principalFor(request), id));
  });
  router.get('/:id', async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await management.get(principalFor(request), id));
  });
  return router;
}
