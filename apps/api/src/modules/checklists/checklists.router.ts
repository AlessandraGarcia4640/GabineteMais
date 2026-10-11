import { Router } from 'express';
import { checklistItemParamsSchema, checklistListQuerySchema, checklistRunQuerySchema, createChecklistSchema, emptyQuerySchema,
  markChecklistItemSchema, startChecklistSchema, updateChecklistSchema, userIdParamsSchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth, requireRole } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { ChecklistsService } from './checklists.service.js';

export function createChecklistsRouter(authorization: AuthorizationService, service: ChecklistsService): Router {
  const router = Router(); router.use(requireAuth(authorization));
  router.get('/templates', async (request, response) => { response.json(await service.templates(principalFor(request), checklistListQuerySchema.parse(request.query))); });
  router.post('/templates', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query);
    const template = await service.create(principalFor(request), createChecklistSchema.parse(request.body));
    response.location(`/checklists/templates/${template.id}`).status(201).json(template);
  });
  router.get('/templates/:id', async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    response.json(await service.template(principalFor(request), id));
  });
  router.patch('/templates/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    response.json(await service.update(principalFor(request), id, updateChecklistSchema.parse(request.body)));
  });
  router.delete('/templates/:id', requireRole(authorization, 'CHEFE'), async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    await service.archive(principalFor(request), id); response.status(204).end();
  });
  router.post('/templates/:id/runs', async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    const result = await service.start(principalFor(request), id, startChecklistSchema.parse(request.body));
    response.location(`/checklists/runs/${result.run.id}`).status(result.created ? 201 : 200).json(result.run);
  });
  router.get('/runs', async (request, response) => { response.json(await service.runs(principalFor(request), checklistRunQuerySchema.parse(request.query))); });
  router.get('/runs/:id', async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id } = userIdParamsSchema.parse(request.params);
    response.json(await service.run(principalFor(request), id));
  });
  router.patch('/runs/:id/items/:itemId', async (request, response) => {
    emptyQuerySchema.parse(request.query); const { id, itemId } = checklistItemParamsSchema.parse(request.params);
    const { isCompleted } = markChecklistItemSchema.parse(request.body);
    response.json(await service.mark(principalFor(request), id, itemId, isCompleted));
  });
  return router;
}
