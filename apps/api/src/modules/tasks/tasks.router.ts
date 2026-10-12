import { Router } from 'express';
import { assignTaskSchema, changeTaskStatusSchema, createTaskSchema, emptyQuerySchema, taskHistoryQuerySchema, taskListQuerySchema, updateTaskSchema, userIdParamsSchema } from '@gabinete-plus/shared';
import { principalFor, requireAuth } from '../../middlewares/require-auth.js';
import type { AuthorizationService } from '../auth/authorization.service.js';
import type { TasksService } from './tasks.service.js';
export function createTasksRouter(authorization: AuthorizationService, service: TasksService): Router {
  const router = Router(); router.use(requireAuth(authorization));
  router.get('/', async (req, res) => { res.json(await service.list(principalFor(req), taskListQuerySchema.parse(req.query))); });
  router.post('/', async (req, res) => { emptyQuerySchema.parse(req.query); const task = await service.create(principalFor(req), createTaskSchema.parse(req.body)); res.location(`/tasks/${task.id}`).status(201).json(task); });
  router.get('/:id/history', async (req, res) => { const { id } = userIdParamsSchema.parse(req.params); res.json(await service.history(principalFor(req), id, taskHistoryQuerySchema.parse(req.query))); });
  router.get('/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.get(principalFor(req), id)); });
  router.patch('/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.update(principalFor(req), id, updateTaskSchema.parse(req.body))); });
  router.patch('/:id/assignee', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.assign(principalFor(req), id, assignTaskSchema.parse(req.body).assigneeId)); });
  router.patch('/:id/status', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); res.json(await service.status(principalFor(req), id, changeTaskStatusSchema.parse(req.body).status)); });
  router.delete('/:id', async (req, res) => { emptyQuerySchema.parse(req.query); const { id } = userIdParamsSchema.parse(req.params); await service.status(principalFor(req), id, 'CANCELADA'); res.status(204).end(); });
  return router;
}
