import { createRoutineSchema, routineListQuerySchema, routinePageSchema, routineSchema, updateRoutineSchema, userIdParamsSchema,
  type CreateRoutine, type Routine, type RoutinePage, type UpdateRoutine } from '@gabinete-plus/shared';
import { z } from 'zod';
import type { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
import { ApiFailure } from '../../lib/api-error.js';
export class RoutinesApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  list(query: z.input<typeof routineListQuerySchema>, signal?: AbortSignal): Promise<RoutinePage> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(routineListQuerySchema.parse(query))) if (value !== undefined) params.set(key, String(value));
    return this.manager.authorized((token) => this.http.get(`/routines?${params.toString()}`, routinePageSchema, token, signal));
  }
  get(id: string, signal?: AbortSignal): Promise<Routine> {
    const valid = userIdParamsSchema.parse({ id });
    return this.manager.authorized((token) => this.http.get(`/routines/${encodeURIComponent(valid.id)}`, routineSchema, token, signal));
  }
  private async manage<T>(request: (token: string) => Promise<T>): Promise<T> {
    try {
      return await this.manager.authorized((token) => {
        if (this.manager.store.getState().user?.role !== 'CHEFE') throw new ApiFailure('FORBIDDEN', 403);
        return request(token);
      });
    } catch (error) { if (error instanceof ApiFailure && error.status === 403) await this.manager.validate(); throw error; }
  }
  create(input: CreateRoutine): Promise<Routine> {
    const valid = createRoutineSchema.parse(input); return this.manage((token) => this.http.send('/routines', routineSchema, 'POST', valid, token));
  }
  update(id: string, input: UpdateRoutine): Promise<Routine> {
    const valid = updateRoutineSchema.parse(input); const target = userIdParamsSchema.parse({ id });
    return this.manage((token) => this.http.send(`/routines/${encodeURIComponent(target.id)}`, routineSchema, 'PATCH', valid, token));
  }
  archive(id: string): Promise<void> {
    const valid = userIdParamsSchema.parse({ id }); return this.manage((token) => this.http.send(`/routines/${encodeURIComponent(valid.id)}`, z.void(), 'DELETE', undefined, token));
  }
}
