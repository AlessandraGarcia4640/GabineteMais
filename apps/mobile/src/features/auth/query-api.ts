import type { QueryClient } from '@tanstack/react-query';
import type { LoginRequest } from '@gabinete-plus/shared';
import type { AuthApi } from './api';
export function queryAuthApi(client: QueryClient, api: AuthApi): AuthApi {
  return {
    get baseUrl() { return api.baseUrl; },
    login: (input) => client.getMutationCache().build(client, { mutationKey: ['auth', 'login'], mutationFn: (value: LoginRequest) => api.login(value), retry: false, gcTime: 0 }).execute(input),
    refresh: (token) => client.getMutationCache().build(client, { mutationKey: ['auth', 'refresh'], mutationFn: (value: string) => api.refresh(value), retry: false, gcTime: 0 }).execute(token),
    logout: (token) => client.getMutationCache().build(client, { mutationKey: ['auth', 'logout'], mutationFn: (value: string) => api.logout(value), retry: false, gcTime: 0 }).execute(token),
    current: (token) => client.fetchQuery({ queryKey: ['auth', 'me'], queryFn: () => api.current(token), retry: false, staleTime: 0, gcTime: 0 }),
  };
}
