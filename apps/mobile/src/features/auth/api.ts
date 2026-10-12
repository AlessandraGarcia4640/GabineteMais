import { apiErrorSchema, currentAccessSchema, loginRequestSchema, loginResponseSchema, refreshRequestSchema,
  type CurrentAccess, type LoginRequest, type LoginResponse } from '@gabinete-plus/shared';
import { z } from 'zod';
import { AuthFailure } from './errors.js';
import { ApiFailure } from '../../lib/api-error.js';
export interface AuthApi {
  readonly baseUrl: string;
  login: (input: LoginRequest) => Promise<LoginResponse>;
  refresh: (refreshToken: string) => Promise<LoginResponse>;
  current: (accessToken: string) => Promise<CurrentAccess>;
  logout: (refreshToken: string) => Promise<void>;
}
export class HttpAuthApi implements AuthApi {
  constructor(private readonly configuredUrl: string | undefined, private readonly fetcher: typeof fetch = fetch) {}
  get baseUrl(): string {
    const value = z.url().safeParse(this.configuredUrl);
    if (!value.success) throw new AuthFailure('configuration');
    const url = new URL(value.data);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new AuthFailure('configuration');
    return url.toString().replace(/\/+$/, '');
  }
  private async request<T>(path: string, schema: z.ZodType<T>, body?: object, accessToken?: string, signal?: AbortSignal, method?: 'POST' | 'PATCH' | 'DELETE'): Promise<T> {
    const baseUrl = this.baseUrl; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    const cancel = () => controller.abort();
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
    try {
      const response = await this.fetcher(`${baseUrl}${path}`, { method: method ?? (body ? 'POST' : 'GET'), signal: controller.signal,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) {
        const envelope = apiErrorSchema.safeParse(await response.json().catch(() => null));
        if (response.status === 401) throw new AuthFailure(path === '/auth/login' ? 'invalidCredentials' : 'sessionExpired');
        if (response.status === 429 || (envelope.success && envelope.data.error.code === 'AUTH_RATE_LIMITED')) throw new AuthFailure('rateLimited');
        if (response.status >= 400 && response.status < 500) throw new ApiFailure(envelope.success ? envelope.data.error.code : 'UNEXPECTED', response.status);
        throw new AuthFailure(response.status >= 500 ? 'network' : 'unexpected');
      }
      return schema.parse(response.status === 204 ? undefined : await response.json());
    } catch (error) {
      if (error instanceof AuthFailure) throw error;
      if (error instanceof ApiFailure) throw error;
      if (error instanceof z.ZodError || error instanceof SyntaxError) throw new AuthFailure('unexpected');
      throw new AuthFailure('network');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  get<T>(path: string, schema: z.ZodType<T>, accessToken: string, signal?: AbortSignal): Promise<T> { return this.request(path, schema, undefined, accessToken, signal); }
  send<T>(path: string, schema: z.ZodType<T>, method: 'POST' | 'PATCH' | 'DELETE', body: object | undefined, accessToken: string): Promise<T> { return this.request(path, schema, body, accessToken, undefined, method); }
  login(input: LoginRequest): Promise<LoginResponse> { return this.request('/auth/login', loginResponseSchema, loginRequestSchema.parse(input)); }
  refresh(refreshToken: string): Promise<LoginResponse> { return this.request('/auth/refresh', loginResponseSchema, refreshRequestSchema.parse({ refreshToken })); }
  current(accessToken: string): Promise<CurrentAccess> { return this.request('/auth/me', currentAccessSchema, undefined, accessToken); }
  logout(refreshToken: string): Promise<void> { return this.request('/auth/logout', z.void(), refreshRequestSchema.parse({ refreshToken })); }
}
