import { z } from 'zod';
import { checklistItemParamsSchema, checklistListQuerySchema, checklistRunQuerySchema, checklistRunPageSchema, checklistRunSchema,
  checklistTemplatePageSchema, checklistTemplateSchema, createChecklistSchema, updateChecklistSchema, startChecklistSchema,
  markChecklistItemSchema, userIdParamsSchema, userDetailSchema, type CreateChecklist, type UpdateChecklist, type StartChecklist } from '@gabinete-plus/shared';
import type { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
import { ApiFailure } from '../../lib/api-error.js';
function search(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams(); for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value)); return params.toString();
}
export class ChecklistsApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  person(id: string, signal?: AbortSignal) {
    const target = userIdParamsSchema.parse({ id }); return this.manager.authorized((token) => this.http.get(`/users/${encodeURIComponent(target.id)}`, userDetailSchema, token, signal));
  }
  list(input: z.input<typeof checklistListQuerySchema>, signal?: AbortSignal) {
    return this.manager.authorized((token) => this.http.get(`/checklists/templates?${search(checklistListQuerySchema.parse(input))}`, checklistTemplatePageSchema, token, signal));
  }
  runs(input: z.input<typeof checklistRunQuerySchema>, signal?: AbortSignal) {
    return this.manager.authorized((token) => this.http.get(`/checklists/runs?${search(checklistRunQuerySchema.parse(input))}`, checklistRunPageSchema, token, signal));
  }
  template(id: string, signal?: AbortSignal) {
    const target = userIdParamsSchema.parse({ id }); return this.manager.authorized((token) => this.http.get(`/checklists/templates/${encodeURIComponent(target.id)}`, checklistTemplateSchema, token, signal));
  }
  run(id: string, signal?: AbortSignal) {
    const target = userIdParamsSchema.parse({ id }); return this.manager.authorized((token) => this.http.get(`/checklists/runs/${encodeURIComponent(target.id)}`, checklistRunSchema, token, signal));
  }
  private async write<T>(request: (token: string) => Promise<T>, chief = false): Promise<T> {
    try { return await this.manager.authorized((token) => {
      if (chief && this.manager.store.getState().user?.role !== 'CHEFE') throw new ApiFailure('FORBIDDEN', 403); return request(token);
    }); } catch (error) { if (error instanceof ApiFailure && error.status === 403) await this.manager.validate(); throw error; }
  }
  create(input: CreateChecklist) { const valid = createChecklistSchema.parse(input); return this.write((token) => this.http.send('/checklists/templates', checklistTemplateSchema, 'POST', valid, token), true); }
  update(id: string, input: UpdateChecklist) {
    const target = userIdParamsSchema.parse({ id }); const valid = updateChecklistSchema.parse(input);
    return this.write((token) => this.http.send(`/checklists/templates/${encodeURIComponent(target.id)}`, checklistTemplateSchema, 'PATCH', valid, token), true);
  }
  archive(id: string) { const target = userIdParamsSchema.parse({ id }); return this.write((token) => this.http.send(`/checklists/templates/${encodeURIComponent(target.id)}`, z.void(), 'DELETE', undefined, token), true); }
  start(id: string, input: StartChecklist) {
    const target = userIdParamsSchema.parse({ id }); const valid = startChecklistSchema.parse(input);
    return this.write((token) => this.http.send(`/checklists/templates/${encodeURIComponent(target.id)}/runs`, checklistRunSchema, 'POST', valid, token));
  }
  mark(id: string, itemId: string, isCompleted: boolean) {
    const target = checklistItemParamsSchema.parse({ id, itemId }); const valid = markChecklistItemSchema.parse({ isCompleted });
    return this.write((token) => this.http.send(`/checklists/runs/${encodeURIComponent(target.id)}/items/${encodeURIComponent(target.itemId)}`, checklistRunSchema, 'PATCH', valid, token));
  }
}
