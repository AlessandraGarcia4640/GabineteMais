import type { CurrentAccess, LoginRequest, LoginResponse } from '@gabinete-plus/shared';
import { createSessionStore } from '../../stores/session-store.js';
import type { AuthApi } from './api.js';
import { AuthFailure, type AuthErrorCode } from './errors.js';
import type { SessionStorage, StoredSession } from './storage.js';
interface Dependencies { api: AuthApi; storage: SessionStorage; clearCache: () => void; now?: () => number }
export class SessionManager {
  readonly store = createSessionStore();
  get apiUrl(): string { return this.dependencies.api.baseUrl; }
  private credentials: LoginResponse | null = null;
  private accessExpiresAt = 0;
  private retainedRefreshToken: string | null = null;
  private revision = 0;
  private bootstrap: Promise<void> | null = null;
  private rotation: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private readonly now: () => number;
  constructor(private readonly dependencies: Dependencies) { this.now = dependencies.now ?? Date.now; }
  private write(operation: () => Promise<void>): Promise<void> {
    const pending = this.writes.then(operation, operation); this.writes = pending.catch(() => undefined); return pending;
  }
  private async revoke(token: string): Promise<boolean> {
    try { await this.dependencies.api.logout(token); return true; } catch { return false; }
  }
  private async clear(code: AuthErrorCode | null): Promise<void> {
    const revision = ++this.revision; this.credentials = null; this.retainedRefreshToken = null; this.rotation = null; this.accessExpiresAt = 0; this.dependencies.clearCache();
    this.store.setState({ status: 'anonymous', user: null, errorCode: code });
    try { await this.write(() => this.dependencies.storage.clear()); }
    catch { if (revision === this.revision) this.store.setState({ status: 'recovery', user: null, errorCode: 'storage' }); }
  }
  private async install(result: LoginResponse, revision: number): Promise<void> {
    if (revision !== this.revision) { await this.revoke(result.refreshToken); return; }
    if (!result.user.isActive) { await this.revoke(result.refreshToken); if (revision === this.revision) await this.clear('sessionExpired'); throw new AuthFailure('sessionExpired'); }
    this.retainedRefreshToken = result.refreshToken;
    try {
      await this.write(() => this.dependencies.storage.save({ refreshToken: result.refreshToken, refreshExpiresAt: result.refreshExpiresAt, apiUrl: this.dependencies.api.baseUrl }));
    } catch {
      await this.revoke(result.refreshToken);
      if (revision === this.revision) await this.clear('storage');
      throw new AuthFailure('storage');
    }
    if (revision !== this.revision) { await this.revoke(result.refreshToken); return; }
    this.credentials = result; this.accessExpiresAt = this.now() + result.expiresIn * 1000;
    this.store.setState({ status: 'authenticated', user: result.user, errorCode: null });
  }
  start(): Promise<void> { this.bootstrap ??= this.restore(); return this.bootstrap; }
  async restore(): Promise<void> {
    const revision = ++this.revision; this.credentials = null; this.rotation = null; this.dependencies.clearCache();
    this.store.setState({ status: 'initializing', user: null, errorCode: null });
    try {
      const saved = await this.dependencies.storage.read(); if (revision !== this.revision) return;
      if (!saved) { this.store.setState({ status: 'anonymous', user: null, errorCode: null }); return; }
      this.retainedRefreshToken = saved.refreshToken;
      if (Date.parse(saved.refreshExpiresAt) <= this.now() || saved.apiUrl !== this.dependencies.api.baseUrl) { await this.clear('sessionExpired'); return; }
      await this.rotate(saved, revision);
    } catch (error) {
      if (revision !== this.revision) return;
      if (error instanceof AuthFailure && error.code === 'sessionExpired') { await this.clear('sessionExpired'); return; }
      this.store.setState({ status: 'recovery', user: null, errorCode: error instanceof AuthFailure ? error.code : 'unexpected' });
    }
  }
  async login(input: LoginRequest): Promise<void> {
    const revision = ++this.revision; this.credentials = null; this.rotation = null; this.dependencies.clearCache();
    this.store.setState({ status: 'anonymous', user: null, errorCode: null });
    const result = await this.dependencies.api.login(input);
    await this.install(result, revision);
  }
  async logout(): Promise<void> {
    const refreshToken = this.credentials?.refreshToken ?? this.retainedRefreshToken;
    const revision = this.revision + 1;
    await this.clear(null);
    if (refreshToken && !await this.revoke(refreshToken) && revision === this.revision && this.store.getState().status === 'anonymous') {
      this.store.setState({ errorCode: 'logoutOffline' });
    }
  }
  private async rotate(saved: Pick<StoredSession, 'refreshToken'>, revision: number): Promise<void> {
    const result = await this.dependencies.api.refresh(saved.refreshToken);
    await this.install(result, revision);
  }
  private renew(): Promise<void> {
    if (this.rotation) return this.rotation;
    const credentials = this.credentials;
    if (!credentials) return Promise.reject(new AuthFailure('sessionExpired'));
    const revision = this.revision;
    const flight = this.rotate(credentials, revision).catch(async (error: Error) => {
      if (revision === this.revision && error instanceof AuthFailure && error.code === 'sessionExpired') await this.clear('sessionExpired');
      throw error;
    });
    this.rotation = flight;
    void flight.finally(() => { if (this.rotation === flight) this.rotation = null; }).catch(() => undefined);
    return flight;
  }
  async authorized<T>(request: (token: string) => Promise<T>): Promise<T> {
    const revision = this.revision;
    if (this.store.getState().status !== 'authenticated' || !this.credentials) throw new AuthFailure('sessionExpired');
    if (this.accessExpiresAt <= this.now() + 30000) await this.renew();
    const token = this.credentials?.accessToken; if (!token || revision !== this.revision) throw new AuthFailure('sessionExpired');
    let result: T;
    try { result = await request(token); }
    catch (error) {
      if (!(error instanceof AuthFailure) || error.code !== 'sessionExpired' || revision !== this.revision) throw error;
      if (this.credentials?.accessToken === token) await this.renew();
      const renewed = this.credentials?.accessToken;
      if (!renewed || revision !== this.revision) throw new AuthFailure('sessionExpired');
      try { result = await request(renewed); }
      catch (retryError) {
        if (retryError instanceof AuthFailure && retryError.code === 'sessionExpired' && revision === this.revision) await this.clear('sessionExpired');
        throw retryError;
      }
    }
    if (revision !== this.revision) throw new AuthFailure('sessionExpired');
    return result;
  }
  async validate(): Promise<void> {
    if (this.store.getState().status !== 'authenticated') return;
    const revision = this.revision;
    try {
      const access: CurrentAccess = await this.authorized((token) => this.dependencies.api.current(token));
      if (revision === this.revision) this.store.setState({ user: access.user, errorCode: null });
    } catch (error) {
      if (revision !== this.revision) return;
      this.dependencies.clearCache();
      this.store.setState({ status: 'recovery', user: null, errorCode: error instanceof AuthFailure ? error.code : 'unexpected' });
    }
  }
}
