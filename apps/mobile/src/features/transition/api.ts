import { z } from 'zod';
import { transitionGuideSchema, transitionQuerySchema, transitionSettingsSchema, updateTransitionSchema, createTransitionSnapshotSchema, transitionSnapshotSchema, transitionSnapshotPageSchema, transitionSnapshotsQuerySchema, userIdParamsSchema, type UpdateTransition, type CreateTransitionSnapshot } from '@gabinete-plus/shared';
import type { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
import { ApiFailure } from '../../lib/api-error.js';
export class TransitionApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  read(input: z.input<typeof transitionQuerySchema>, signal?: AbortSignal) { const query = transitionQuerySchema.parse(input); const params = new URLSearchParams({ section: query.section, limit: String(query.limit), ...(query.cursor ? { cursor: query.cursor } : {}) }); return this.manager.authorized((token) => this.http.get(`/transition-guide?${params.toString()}`, transitionGuideSchema, token, signal)); }
  list(cursor?: string, signal?: AbortSignal) { const query = transitionSnapshotsQuerySchema.parse({ limit: 20, ...(cursor ? { cursor } : {}) }); return this.manager.authorized((token) => this.http.get(`/transition-guide/snapshots?limit=20${query.cursor ? `&cursor=${String(query.cursor)}` : ''}`, transitionSnapshotPageSchema, token, signal)); }
  get(id: string, signal?: AbortSignal) { const valid = userIdParamsSchema.parse({ id }); return this.manager.authorized((token) => this.http.get(`/transition-guide/snapshots/${encodeURIComponent(valid.id)}`, transitionSnapshotSchema, token, signal)); }
  private async manage<T>(request: (token: string) => Promise<T>) { try { return await this.manager.authorized((token) => { if (this.manager.store.getState().user?.role !== 'CHEFE') throw new ApiFailure('FORBIDDEN', 403); return request(token); }); } catch (error) { if (error instanceof ApiFailure && error.status === 403) await this.manager.validate(); throw error; } }
  update(input: UpdateTransition) { return this.manage((token) => this.http.send('/transition-guide', transitionSettingsSchema, 'PATCH', updateTransitionSchema.parse(input), token)); }
  create(input: CreateTransitionSnapshot) { return this.manage((token) => this.http.send('/transition-guide/snapshots', transitionSnapshotSchema, 'POST', createTransitionSnapshotSchema.parse(input), token)); }
}
