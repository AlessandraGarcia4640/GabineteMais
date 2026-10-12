import { loginResponseSchema, type LoginResponse } from '@gabinete-plus/shared';
import { SessionManager } from './session-manager';
import type { AuthApi } from './api';
import { AuthFailure } from './errors';
import type { SessionStorage, StoredSession } from './storage';
function response(token = 'A', name = 'Pessoa Fictícia'): LoginResponse {
  return loginResponseSchema.parse({ accessToken: `access-${token}`, refreshToken: token.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z',
    tokenType: 'Bearer', expiresIn: 900, user: { id: name, name, email: 'pessoa@example.invalid', role: 'ASSESSOR', isActive: true } });
}
function fixture() {
  let time = Date.parse('2026-10-11T12:00:00Z'); let saved: StoredSession | null = null;
  const login = jest.fn((input: { email: string; password: string }) => { void input; return Promise.resolve(response()); });
  const refresh = jest.fn((token: string) => { void token; return Promise.resolve(response('B')); });
  const logout = jest.fn((token: string) => { void token; return Promise.resolve(); });
  const api: AuthApi = { baseUrl: 'https://api.example.invalid', login, refresh, logout, current: () => Promise.resolve({ user: response().user, permissions: ['tasks:read'] }) };
  const storage: SessionStorage = { read: () => Promise.resolve(saved), save: (value) => { saved = value; return Promise.resolve(); }, clear: () => { saved = null; return Promise.resolve(); } };
  const clearCache = jest.fn(); const manager = new SessionManager({ api, storage, clearCache, now: () => time });
  return { manager, api, storage, login, refresh, logout, clearCache, saved: () => saved, advance: () => { time += 900000; } };
}
const input = { email: 'pessoa@example.invalid', password: 'Senha-ficticia-34' };
it('login persiste só refresh/validade/origem e não publica segredos no store', async () => {
  const f = fixture(); await f.manager.start(); await f.manager.login(input);
  expect(f.manager.store.getState()).toMatchObject({ status: 'authenticated', user: { name: 'Pessoa Fictícia' } });
  expect(f.saved()).toEqual({ refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', apiUrl: f.api.baseUrl });
  expect(JSON.stringify(f.manager.store.getState())).not.toContain('access-'); expect(JSON.stringify(f.saved())).not.toContain(input.password);
});
it('reinício recupera sessão por rotação e persiste token novo', async () => {
  const f = fixture(); await f.manager.login(input);
  const restarted = new SessionManager({ api: f.api, storage: f.storage, clearCache: f.clearCache });
  await Promise.all([restarted.start(), restarted.start()]); expect(f.refresh).toHaveBeenCalledTimes(1); expect(f.refresh).toHaveBeenCalledWith('A'.repeat(43));
  expect(f.saved()?.refreshToken).toBe('B'.repeat(43)); expect(restarted.store.getState().status).toBe('authenticated');
});
it('sessão expirada é removida sem enviar refresh ao servidor', async () => {
  const f = fixture(); await f.storage.save({ refreshToken: 'A'.repeat(43), refreshExpiresAt: '2000-01-01T00:00:00Z', apiUrl: f.api.baseUrl });
  await f.manager.start(); expect(f.refresh).not.toHaveBeenCalled(); expect(f.saved()).toBeNull(); expect(f.manager.store.getState()).toMatchObject({ status: 'anonymous', errorCode: 'sessionExpired' });
});
it('não envia refresh persistido para uma API de outra origem', async () => {
  const f = fixture(); await f.storage.save({ refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', apiUrl: 'https://outro.example.invalid' });
  await f.manager.start(); expect(f.refresh).not.toHaveBeenCalled(); expect(f.saved()).toBeNull();
});
it('falha de conexão na recuperação mantém token para tentativa manual', async () => {
  const f = fixture(); await f.manager.login(input); f.refresh.mockRejectedValueOnce(new AuthFailure('network'));
  await f.manager.restore(); expect(f.manager.store.getState()).toMatchObject({ status: 'recovery', user: null, errorCode: 'network' }); expect(f.saved()).not.toBeNull();
  await f.manager.restore(); expect(f.manager.store.getState().status).toBe('authenticated');
});
it('refresh revogado limpa armazenamento e retorna ao login', async () => {
  const f = fixture(); await f.manager.login(input); f.refresh.mockRejectedValue(new AuthFailure('sessionExpired'));
  await f.manager.restore(); expect(f.saved()).toBeNull(); expect(f.manager.store.getState()).toMatchObject({ status: 'anonymous', errorCode: 'sessionExpired' });
});
it('requisições simultâneas compartilham a renovação do access token', async () => {
  const f = fixture(); await f.manager.login(input); f.advance();
  const tokens = await Promise.all([f.manager.authorized((token) => Promise.resolve(token)), f.manager.authorized((token) => Promise.resolve(token))]);
  expect(f.refresh).toHaveBeenCalledTimes(1); expect(tokens).toEqual(['access-B', 'access-B']);
});
it('401 concorrentes com token antigo não provocam duas rotações', async () => {
  const f = fixture(); await f.manager.login(input);
  const request = (token: string) => token === 'access-A' ? Promise.reject(new AuthFailure('sessionExpired')) : Promise.resolve(token);
  expect(await Promise.all([f.manager.authorized(request), f.manager.authorized(request)])).toEqual(['access-B', 'access-B']); expect(f.refresh).toHaveBeenCalledTimes(1);
});
it('401 persistente após refresh encerra acesso sem repetir indefinidamente', async () => {
  const f = fixture(); await f.manager.login(input);
  const request = jest.fn(() => Promise.reject(new AuthFailure('sessionExpired')));
  await expect(f.manager.authorized(request)).rejects.toMatchObject({ code: 'sessionExpired' }); expect(request).toHaveBeenCalledTimes(2); expect(f.refresh).toHaveBeenCalledTimes(1);
  expect(f.manager.store.getState().status).toBe('anonymous'); expect(f.saved()).toBeNull();
});
it('logout limpa cache e sessão mesmo sem rede', async () => {
  const f = fixture(); await f.manager.login(input); f.logout.mockRejectedValue(new AuthFailure('network'));
  await f.manager.logout(); expect(f.saved()).toBeNull(); expect(f.clearCache).toHaveBeenCalled(); expect(f.manager.store.getState()).toMatchObject({ status: 'anonymous', user: null, errorCode: 'logoutOffline' });
});
it('sair da recuperação também revoga o refresh guardado', async () => {
  const f = fixture(); await f.manager.login(input); f.refresh.mockRejectedValueOnce(new AuthFailure('network'));
  await f.manager.restore(); await f.manager.logout(); expect(f.logout).toHaveBeenCalledWith('A'.repeat(43)); expect(f.saved()).toBeNull();
});
it('falha ao guardar credenciais impede acesso e tenta revogar sessão criada', async () => {
  const f = fixture(); f.storage.save = () => Promise.reject(new AuthFailure('storage'));
  await expect(f.manager.login(input)).rejects.toMatchObject({ code: 'storage' }); expect(f.manager.store.getState().status).toBe('anonymous'); expect(f.logout).toHaveBeenCalledWith('A'.repeat(43));
});
it('falha ao remover credenciais bloqueia a área protegida', async () => {
  const f = fixture(); await f.manager.login(input); f.storage.clear = () => Promise.reject(new AuthFailure('storage'));
  await f.manager.logout(); expect(f.manager.store.getState()).toMatchObject({ status: 'recovery', user: null, errorCode: 'storage' });
});
it('resposta atrasada de login não ressuscita sessão após sair', async () => {
  const f = fixture(); let resolve: (value: LoginResponse) => void = () => { throw new Error('Promise não preparada.'); };
  f.login.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const pending = f.manager.login(input); await f.manager.logout(); resolve(response()); await pending;
  expect(f.manager.store.getState().status).toBe('anonymous'); expect(f.saved()).toBeNull(); expect(f.logout).toHaveBeenCalledWith('A'.repeat(43));
});
it('resposta protegida tardia não entrega dados após logout', async () => {
  const f = fixture(); await f.manager.login(input); let resolve: (value: string) => void = () => { throw new Error('Promise não preparada.'); };
  const pending = f.manager.authorized(() => new Promise<string>((done) => { resolve = done; }));
  await f.manager.logout(); resolve('dados'); await expect(pending).rejects.toMatchObject({ code: 'sessionExpired' });
});
it('retorno ao primeiro plano consulta o perfil atual', async () => {
  const f = fixture(); await f.manager.login(input);
  f.api.current = () => Promise.resolve({ user: { ...response().user, role: 'APOIO' }, permissions: ['tasks:read'] });
  await f.manager.validate(); expect(f.manager.store.getState().user?.role).toBe('APOIO');
});
it('resposta com usuário inativo não habilita navegação protegida', async () => {
  const f = fixture(); f.login.mockResolvedValue({ ...response(), user: { ...response().user, isActive: false } });
  await expect(f.manager.login(input)).rejects.toMatchObject({ code: 'sessionExpired' }); expect(f.manager.store.getState().status).toBe('anonymous'); expect(f.saved()).toBeNull();
});
