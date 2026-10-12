import { z } from 'zod';
import { createGuidelineSchema, updateGuidelineSchema, guidelineSchema, guidelinePageSchema, guidelineVersionSchema, guidelineVersionPageSchema, guidelineListQuerySchema, guidelineHistoryQuerySchema, guidelineVersionParamsSchema, userIdParamsSchema, type CreateGuideline, type UpdateGuideline } from '@gabinete-plus/shared';
import type { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
import { ApiFailure } from '../../lib/api-error.js';
function search(query: Record<string, string | number | boolean | undefined>) { const p = new URLSearchParams(); for (const [k, v] of Object.entries(query)) if (v !== undefined) p.set(k, String(v)); return p.toString(); }
const target = (id: string) => encodeURIComponent(userIdParamsSchema.parse({ id }).id);
export class GuidelinesApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  list(input: z.input<typeof guidelineListQuerySchema>, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/guidelines?${search(guidelineListQuerySchema.parse(input))}`, guidelinePageSchema, token, signal)); }
  get(id: string, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/guidelines/${target(id)}`, guidelineSchema, token, signal)); }
  history(id: string, cursor?: string, signal?: AbortSignal) { return this.manager.authorized((token) => this.http.get(`/guidelines/${target(id)}/versions?${search(guidelineHistoryQuerySchema.parse({ limit: 20, ...(cursor ? { cursor } : {}) }))}`, guidelineVersionPageSchema, token, signal)); }
  version(id: string, version: number, signal?: AbortSignal) { const valid = guidelineVersionParamsSchema.parse({ id, version }); return this.manager.authorized((token) => this.http.get(`/guidelines/${target(valid.id)}/versions/${String(valid.version)}`, guidelineVersionSchema, token, signal)); }
  private async manage<T>(request: (token: string) => Promise<T>) { try { return await this.manager.authorized((token) => { if (this.manager.store.getState().user?.role !== 'CHEFE') throw new ApiFailure('FORBIDDEN', 403); return request(token); }); } catch (error) { if (error instanceof ApiFailure && error.status === 403) await this.manager.validate(); throw error; } }
  create(input: CreateGuideline) { const valid = createGuidelineSchema.parse(input); return this.manage((token) => this.http.send('/guidelines', guidelineSchema, 'POST', valid, token)); }
  update(id: string, input: UpdateGuideline) { const valid = updateGuidelineSchema.parse(input); return this.manage((token) => this.http.send(`/guidelines/${target(id)}`, guidelineSchema, 'PATCH', valid, token)); }
  archive(id: string) { return this.manage((token) => this.http.send(`/guidelines/${target(id)}`, z.void(), 'DELETE', undefined, token)); }
}
