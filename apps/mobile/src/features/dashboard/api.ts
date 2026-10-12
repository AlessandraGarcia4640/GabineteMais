import { routineListQuerySchema, routinePageSchema, taskListQuerySchema, taskPageSchema, type RoutinePage, type TaskPage } from '@gabinete-plus/shared';
import type { z } from 'zod';
import { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
function queryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
  return params.toString();
}
export class DashboardApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  tasks(query: z.input<typeof taskListQuerySchema>, signal?: AbortSignal): Promise<TaskPage> {
    return this.manager.authorized((token) => this.http.get(`/tasks?${queryString(taskListQuerySchema.parse(query))}`, taskPageSchema, token, signal));
  }
  routines(query: z.input<typeof routineListQuerySchema>, signal?: AbortSignal): Promise<RoutinePage> {
    return this.manager.authorized((token) => this.http.get(`/routines?${queryString(routineListQuerySchema.parse(query))}`, routinePageSchema, token, signal));
  }
}
