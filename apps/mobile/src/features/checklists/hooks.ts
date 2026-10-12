import { useMemo, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChecklistRun } from '@gabinete-plus/shared';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { HttpAuthApi } from '../auth/api';
import { AuthFailure } from '../auth/errors';
import { ApiFailure } from '../../lib/api-error';
import { strings } from '../../lib/strings';
import { ChecklistsApi } from './api';
import { optimisticMark } from './model';
export function useChecklistsApi() { const manager = useSessionManager(); return useMemo(() => new ChecklistsApi(new HttpAuthApi(manager.apiUrl), manager), [manager]); }
export function useTemplate(id?: string) { const api = useChecklistsApi(); const { user } = useSession(); return useQuery({ queryKey: ['checklist-template', id, user?.id], enabled: !!id && !!user, retry: false, queryFn: ({ signal }) => api.template(id ?? '', signal) }); }
export function useRun(id?: string) { const api = useChecklistsApi(); const { user } = useSession(); return useQuery({ queryKey: ['checklist-run', id, user?.id], enabled: !!id && !!user, retry: false, queryFn: ({ signal }) => api.run(id ?? '', signal) }); }
export function useTemplates(archived: boolean, routineId?: string) {
  const api = useChecklistsApi(); const { user } = useSession();
  return useInfiniteQuery({ queryKey: ['checklist-templates', user?.id, archived, routineId], enabled: !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.list({ limit: 20, isArchived: archived ? 'true' : 'false', ...(routineId ? { routineId } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal), getNextPageParam: (page) => page.nextCursor || undefined });
}
export function useRuns(mine: boolean, templateId?: string) {
  const api = useChecklistsApi(); const { user } = useSession();
  return useInfiniteQuery({ queryKey: ['checklist-runs', user?.id, mine, templateId], enabled: !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.runs({ limit: 20, ...(mine && user ? { assigneeId: user.id } : {}), ...(templateId ? { templateId } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal), getNextPageParam: (page) => page.nextCursor || undefined });
}
export function useMarkItem(id?: string) {
  const api = useChecklistsApi(); const { user } = useSession(); const manager = useSessionManager(); const client = useQueryClient(); const locked = useRef(false);
  const key = ['checklist-run', id, user?.id];
  const sameSession = () => manager.store.getState().status === 'authenticated' && manager.store.getState().user?.id === user?.id;
  const mutation = useMutation({ retry: false, mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) => api.mark(id ?? '', itemId, done),
    onMutate: async ({ itemId, done }) => {
      await client.cancelQueries({ queryKey: key }); const previous = client.getQueryData<ChecklistRun>(key);
      if (previous && user && sameSession()) client.setQueryData(key, optimisticMark(previous, itemId, done, user.id)); return { previous };
    }, onError: (_error, _variables, context) => { if (context?.previous && sameSession()) client.setQueryData(key, context.previous); },
    onSuccess: (run) => { if (sameSession()) client.setQueryData(key, run); },
    onSettled: async () => { if (sameSession()) await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ['checklist-runs'] })]); locked.current = false; },
  });
  return { ...mutation, mark(itemId: string, done: boolean) { if (locked.current) return; locked.current = true; mutation.mutate({ itemId, done }); } };
}
export function checklistError(error: Error): string {
  if (error instanceof ApiFailure) {
    if (error.status === 403) return strings.checklists.forbidden;
    if (error.status === 404) return strings.checklists.notFound;
    if (error.code === 'CHECKLIST_TASK_COMPLETED') return strings.checklists.completedTask;
    if (error.code === 'CHECKLIST_TEMPLATE_ARCHIVED' || error.code === 'ROUTINE_ARCHIVED') return strings.checklists.archivedError;
    if (error.code === 'CHECKLIST_RUN_EXISTS') return strings.checklists.exists;
    if (error.code === 'CHECKLIST_ASSIGNEE_INACTIVE') return strings.checklists.inactive;
    if (error.code === 'CHECKLIST_EMPTY') return strings.checklists.invalidItems;
  }
  return error instanceof AuthFailure && error.code !== 'unexpected' ? error.message : strings.routines.requestError;
}
