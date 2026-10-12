import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Guideline } from '@gabinete-plus/shared';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { HttpAuthApi } from '../auth/api';
import { GuidelinesApi } from './api';
import { ApiFailure } from '../../lib/api-error';
import { AuthFailure } from '../auth/errors';
import { strings } from '../../lib/strings';
export function useGuidelinesApi() { const manager = useSessionManager(); return useMemo(() => new GuidelinesApi(new HttpAuthApi(process.env.EXPO_PUBLIC_API_URL), manager), [manager]); }
export function useGuideline(id?: string) { const api = useGuidelinesApi(); const { user } = useSession(); return useQuery({ queryKey: ['guideline', id, user?.id], enabled: !!id && !!user, retry: false, queryFn: ({ signal }) => api.get(id ?? '', signal) }); }
export function useGuidelines(archived: boolean, q: string, category: Guideline['category'] | '') { const api = useGuidelinesApi(); const { user } = useSession(); return useInfiniteQuery({ queryKey: ['guidelines', user?.id, archived, q, category], enabled: !!user, retry: false, initialPageParam: '', queryFn: ({ pageParam, signal }) => api.list({ limit: 20, isArchived: archived ? 'true' : 'false', ...(q ? { q } : {}), ...(category ? { category } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal), getNextPageParam: (page) => page.nextCursor || undefined }); }
export function useGuidelineHistory(id?: string) { const api = useGuidelinesApi(); const { user } = useSession(); return useInfiniteQuery({ queryKey: ['guideline-versions', id, user?.id], enabled: !!id && !!user, retry: false, initialPageParam: '', queryFn: ({ pageParam, signal }) => api.history(id ?? '', pageParam, signal), getNextPageParam: (page) => page.nextCursor || undefined }); }
export function guidelineError(error: Error) { if (error instanceof ApiFailure) { if (error.code === 'FORBIDDEN') return strings.guidelines.forbidden; if (error.code === 'GUIDELINE_NOT_FOUND') return strings.guidelines.notFound; if (error.code === 'GUIDELINE_VERSION_CONFLICT') return strings.guidelines.conflict; if (error.code === 'GUIDELINE_ARCHIVED') return strings.guidelines.archived; } return error instanceof AuthFailure ? error.message : strings.contacts.requestError; }
