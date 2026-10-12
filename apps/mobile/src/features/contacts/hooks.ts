import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { HttpAuthApi } from '../auth/api';
import { AuthFailure } from '../auth/errors';
import { ApiFailure } from '../../lib/api-error';
import { strings } from '../../lib/strings';
import { ContactsApi } from './api';
export function useContactsApi() { const manager = useSessionManager(); return useMemo(() => new ContactsApi(new HttpAuthApi(manager.apiUrl), manager), [manager]); }
export function useContact(id?: string) { const api = useContactsApi(); const { user } = useSession(); return useQuery({ queryKey: ['contact', id, user?.id], enabled: !!id && !!user, retry: false, queryFn: ({ signal }) => api.get(id ?? '', signal) }); }
export interface ContactFilters { q: string; organization: string; tag: string; archived: boolean; keyOnly: boolean }
export function useContacts(filters: ContactFilters) {
  const api = useContactsApi(); const { user } = useSession();
  return useInfiniteQuery({ queryKey: ['contacts', user?.id, filters], enabled: !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.list({ limit: 20, isArchived: filters.archived ? 'true' : 'false', ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
      ...(filters.organization.trim() ? { organization: filters.organization.trim() } : {}), ...(filters.tag.trim() ? { tag: filters.tag.trim() } : {}), ...(filters.keyOnly ? { isKeyContact: 'true' } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    getNextPageParam: (page) => page.nextCursor || undefined });
}
export function contactError(error: Error): string {
  if (error instanceof ApiFailure) {
    if (error.code === 'FORBIDDEN') return strings.contacts.forbidden;
    if (error.code === 'CONTACT_NOT_FOUND') return strings.contacts.notFound;
    if (error.code === 'CONTACT_ARCHIVED') return strings.contacts.archivedError;
  }
  return error instanceof AuthFailure && error.code !== 'unexpected' ? error.message : strings.contacts.requestError;
}
