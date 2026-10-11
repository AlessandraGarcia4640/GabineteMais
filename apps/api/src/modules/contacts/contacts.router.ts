import { Router } from 'express';
import { contactListQuerySchema, createContactSchema, emptyQuerySchema, updateContactSchema, userIdParamsSchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth, requireRole } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { ContactsService } from './contacts.service.js';
export function createContactsRouter(authorization: AuthorizationService, service: ContactsService): Router {
  const router = Router(); router.use(requireAuth(authorization));
  router.get('/', async (request, response) => { response.json(await service.list(principalFor(request), contactListQuerySchema.parse(request.query))); });
  router.post('/', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query); const contact = await service.create(principalFor(request), createContactSchema.parse(request.body));
    response.location(`/contacts/${contact.id}`).status(201).json(contact);
  });
  router.get('/:id', async (request, response) => { emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params); response.json(await service.get(principalFor(request), id)); });
  router.patch('/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    response.json(await service.update(principalFor(request), id, updateContactSchema.parse(request.body)));
  });
  router.delete('/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    await service.archive(principalFor(request), id); response.status(204).end();
  });
  return router;
}
