import { QueryClient } from '@tanstack/react-query';
import { loginResponseSchema } from '@gabinete-plus/shared';
import { queryAuthApi } from './query-api';
import type { AuthApi } from './api';
import { AuthFailure } from './errors';
function fixture() {
  const result = loginResponseSchema.parse({ accessToken: 'access-ficticio', refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', expiresIn: 900, tokenType: 'Bearer',
    user: { id: 'actor', name: 'Pessoa Fictícia', email: 'pessoa@example.invalid', role: 'ASSESSOR', isActive: true } });
  const login = jest.fn(() => Promise.resolve(result)); const refresh = jest.fn(() => Promise.reject(new AuthFailure('network')));
  const current = jest.fn(() => Promise.resolve({ user: result.user, permissions: [] }));
  const api: AuthApi = { baseUrl: 'https://api.example.invalid', login, refresh, current, logout: () => Promise.resolve() };
  const client = new QueryClient(); return { client, api: queryAuthApi(client, api), login, refresh, current };
}
it('login usa mutation e não grava senha na chave de cache', async () => {
  const f = fixture();
  try {
    await f.api.login({ email: 'pessoa@example.invalid', password: 'Senha-ficticia-34' });
    expect(f.login).toHaveBeenCalledTimes(1); expect(f.client.getMutationCache().getAll()[0]?.options.mutationKey).toEqual(['auth', 'login']);
  } finally { f.client.clear(); }
});
it('refresh não é repetido automaticamente em falha de rede', async () => {
  const f = fixture();
  try { await expect(f.api.refresh('A'.repeat(43))).rejects.toMatchObject({ code: 'network' }); expect(f.refresh).toHaveBeenCalledTimes(1); }
  finally { f.client.clear(); }
});
it('consultas simultâneas do perfil compartilham query sem token na chave', async () => {
  const f = fixture();
  try {
    await Promise.all([f.api.current('access-ficticio'), f.api.current('access-ficticio')]);
    expect(f.current).toHaveBeenCalledTimes(1); expect(f.client.getQueryCache().getAll()[0]?.queryKey).toEqual(['auth', 'me']);
  } finally { f.client.clear(); }
});
