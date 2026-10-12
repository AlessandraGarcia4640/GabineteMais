import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Task } from '@gabinete-plus/shared';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { HttpAuthApi } from '../auth/api';
import { AuthFailure } from '../auth/errors';
import { ApiFailure } from '../../lib/api-error';
import { strings } from '../../lib/strings';
import { TasksApi } from './api';
export function useTasksApi() { const manager = useSessionManager(); return useMemo(() => new TasksApi(new HttpAuthApi(manager.apiUrl), manager), [manager]); }
export function useTask(id?: string) { const api = useTasksApi(); const { user } = useSession(); return useQuery({ queryKey: ['task', id, user?.id], enabled: !!id && !!user, retry: false, queryFn: ({ signal }) => api.get(id ?? '', signal) }); }
export function useTaskPerson(id?: string) { const api = useTasksApi(); const { user } = useSession(); return useQuery({ queryKey: ['task-person', id, user?.id], enabled: !!id && !!user && user.id !== id, retry: false, queryFn: ({ signal }) => api.person(id ?? '', signal) }); }
export function useTasks(filters: { mine: boolean; status: Task['status'] | ''; priority: Task['priority'] | ''; q: string; overdue: boolean }, day: string) {
  const api = useTasksApi(); const { user } = useSession(); return useInfiniteQuery({ queryKey: ['tasks', 'catalog', user?.id, filters, day], enabled: !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.list({ limit: 20, ...(filters.mine && user ? { assigneeId: user.id } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.priority ? { priority: filters.priority } : {}), ...(filters.q.trim() ? { q: filters.q.trim() } : {}), ...(filters.overdue ? { overdue: 'true' } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal), getNextPageParam: (page) => page.nextCursor || undefined });
}
export function useTaskHistory(id?: string) {
  const api = useTasksApi(); const { user } = useSession(); return useInfiniteQuery({ queryKey: ['task-history', id, user?.id], enabled: !!id && !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.history(id ?? '', pageParam, signal), getNextPageParam: (page) => page.nextCursor || undefined });
}
export function taskError(error: Error): string {
  if (error instanceof ApiFailure) {
    if (error.code === 'FORBIDDEN') return strings.tasks.forbidden;
    if (error.status === 404) return strings.tasks.notFound;
    if (error.code === 'TASK_CLOSED') return strings.tasks.closed;
    if (error.code === 'TASK_INVALID_TRANSITION') return strings.tasks.invalidTransition;
    if (error.code === 'TASK_CHECKLIST_INCOMPLETE') return strings.tasks.incomplete;
    if (error.code === 'TASK_CHECKLIST_MISMATCH') return strings.tasks.mismatch;
    if (error.code === 'TASK_ASSIGNEE_INACTIVE') return strings.tasks.inactive;
    if (error.code === 'ROUTINE_ARCHIVED' || error.code === 'CONTACT_ARCHIVED') return strings.tasks.archivedLink;
  }
  return error instanceof AuthFailure && error.code !== 'unexpected' ? error.message : strings.contacts.requestError;
}
