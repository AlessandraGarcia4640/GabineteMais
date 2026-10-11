import { Router } from 'express';
import { emptyQuerySchema, userIdParamsSchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth, requireRole } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { UserAccessService } from './user-access.service.js';

export function createUserAccessRouter(authorization: AuthorizationService, service: UserAccessService): Router {
  const router = Router();
  router.use(requireAuth(authorization));
  router.get('/:id/permissions', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const { id } = userIdParamsSchema.parse(request.params);
    response.status(200).json(await service.permissions(principalFor(request), id));
  });
  return router;
}
