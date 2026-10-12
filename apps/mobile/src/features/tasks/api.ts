import { z } from 'zod';
import { taskSchema, taskPageSchema, taskListQuerySchema, createTaskSchema, updateTaskSchema, assignTaskSchema, changeTaskStatusSchema, userIdParamsSchema,
  taskHistoryQuerySchema, taskEventPageSchema, userPageSchema, userListQuerySchema, userDetailSchema, routinePageSchema, routineListQuerySchema,
  contactPageSchema, contactListQuerySchema, checklistRunPageSchema, checklistRunQuerySchema, type CreateTask, type UpdateTask, type Task } from '@gabinete-plus/shared';
import type { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
import { ApiFailure } from '../../lib/api-error.js';
function search(query: Record<string, string | number | boolean | undefined>) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value)); return params.toString(); }
function target(id: string) { return encodeURIComponent(userIdParamsSchema.parse({ id }).id); }
export type ResourceKind = 'person' | 'routine' | 'contact' | 'run';
export interface ResourceOption { id: string; label: string; routineId?: string; routineTitle?: string }
export interface ResourcePage { items: ResourceOption[]; nextCursor: string | null }
export class TasksApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  list(input: z.input<typeof taskListQuerySchema>, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/tasks?${search(taskListQuerySchema.parse(input))}`, taskPageSchema, token, signal)); }
  get(id: string, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/tasks/${target(id)}`, taskSchema, token, signal)); }
  history(id: string, cursor?: string, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/tasks/${target(id)}/history?${search(taskHistoryQuerySchema.parse({ limit: 20, ...(cursor ? { cursor } : {}) }))}`, taskEventPageSchema, token, signal)); }
  person(id: string, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/users/${target(id)}`, userDetailSchema, token, signal)); }
  private async write<T>(request: (token: string) => Promise<T>, forOther?: string): Promise<T> {
    try { return await this.manager.authorized((token) => {
      const actor = this.manager.store.getState().user;
      if (forOther && actor?.id !== forOther && actor?.role !== 'CHEFE') throw new ApiFailure('FORBIDDEN', 403); return request(token);
    }); } catch (error) { if (error instanceof ApiFailure && error.status === 403) await this.manager.validate(); throw error; }
  }
  create(input: CreateTask) { const valid = createTaskSchema.parse(input); return this.write((token) => this.http.send('/tasks', taskSchema, 'POST', valid, token), valid.assigneeId); }
  update(id: string, input: UpdateTask) { const valid = updateTaskSchema.parse(input); return this.write((token) => this.http.send(`/tasks/${target(id)}`, taskSchema, 'PATCH', valid, token)); }
  assign(id: string, assigneeId: string) { const valid = assignTaskSchema.parse({ assigneeId }); return this.write((token) => this.http.send(`/tasks/${target(id)}/assignee`, taskSchema, 'PATCH', valid, token)); }
  status(id: string, status: Task['status']) { const valid = changeTaskStatusSchema.parse({ status }); return this.write((token) => this.http.send(`/tasks/${target(id)}/status`, taskSchema, 'PATCH', valid, token)); }
  choices(kind: ResourceKind, cursor: string, assigneeId: string, routineId: string | null, signal?: AbortSignal): Promise<ResourcePage> {
    const paging = { limit: 20, ...(cursor ? { cursor } : {}) };
    return this.manager.authorized(async (token) => {
      if (kind === 'person') { const page = await this.http.get(`/users?${search(userListQuerySchema.parse({ ...paging, isActive: 'true' }))}`, userPageSchema, token, signal); return { ...page, items: page.items.map((item) => ({ id: item.id, label: item.name })) }; }
      if (kind === 'routine') { const page = await this.http.get(`/routines?${search(routineListQuerySchema.parse({ ...paging, isArchived: 'false' }))}`, routinePageSchema, token, signal); return { ...page, items: page.items.map((item) => ({ id: item.id, label: item.title })) }; }
      if (kind === 'contact') { const page = await this.http.get(`/contacts?${search(contactListQuerySchema.parse({ ...paging, isArchived: 'false' }))}`, contactPageSchema, token, signal); return { ...page, items: page.items.map((item) => ({ id: item.id, label: `${item.name} · ${item.organization}` })) }; }
      const page = await this.http.get(`/checklists/runs?${search(checklistRunQuerySchema.parse({ ...paging, assigneeId, ...(routineId ? { routineId } : {}) }))}`, checklistRunPageSchema, token, signal);
      return { ...page, items: page.items.map((item) => ({ id: item.id, label: `${item.titleSnapshot} · ${item.periodStart}`, routineId: item.routineId, routineTitle: item.routineTitleSnapshot })) };
    });
  }
}
