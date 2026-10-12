import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { HttpAuthApi } from '../auth/api';
import { RoutinesApi } from './api';
import type { Routine } from '@gabinete-plus/shared';
import { ApiFailure } from '../../lib/api-error';
import { AuthFailure } from '../auth/errors';
import { strings } from '../../lib/strings';
export function useRoutinesApi() {
  const manager = useSessionManager(); return useMemo(() => new RoutinesApi(new HttpAuthApi(manager.apiUrl), manager), [manager]);
}
export function useRoutine(id: string | undefined) {
  const api = useRoutinesApi(); const { user } = useSession();
  return useQuery({ queryKey: ['routine', id, user?.id], enabled: !!id && !!user, retry: false, queryFn: ({ signal }) => api.get(id ?? '', signal) });
}
export function useRoutineList(mode: 'all' | 'today' | 'archived', day: string, q: string, frequency: Routine['frequency'] | '') {
  const api = useRoutinesApi(); const { user } = useSession();
  return useInfiniteQuery({ queryKey: ['routines', 'catalog', user?.id, mode, day, q, frequency], enabled: !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.list({ limit: 20, isArchived: mode === 'archived' ? 'true' : 'false', ...(mode === 'today' ? { scheduledFor: day } : {}),
      ...(q.trim() ? { q: q.trim() } : {}), ...(frequency ? { frequency } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    getNextPageParam: (page) => page.nextCursor || undefined });
}
export function routineError(error: Error): string {
  if (error instanceof ApiFailure) {
    if (error.code === 'FORBIDDEN') return strings.routines.forbidden;
    if (error.code === 'ROUTINE_NOT_FOUND') return strings.routines.notFound;
    if (error.code === 'ROUTINE_ARCHIVED') return strings.routines.archivedError;
  }
  if (error instanceof AuthFailure && error.code !== 'unexpected') return error.message;
  return strings.routines.requestError;
}
