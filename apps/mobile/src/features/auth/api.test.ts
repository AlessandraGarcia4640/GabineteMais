import { HttpAuthApi } from './api';
import { z } from 'zod';
const input = { email: 'pessoa@example.invalid', password: 'Senha-ficticia-34' };
it.each([401, 429, 503])('traduz HTTP %s sem exibir a mensagem interna do servidor', async (status) => {
  const fetcher: typeof fetch = () => Promise.resolve(new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'Detalhe interno' } }), { status }));
  const api = new HttpAuthApi('https://api.example.invalid', fetcher);
  await expect(api.login(input)).rejects.toMatchObject({ code: status === 401 ? 'invalidCredentials' : status === 429 ? 'rateLimited' : 'network' });
});
it('resposta de login incompatível com shared não cria sessão', async () => {
  const fetcher: typeof fetch = () => Promise.resolve(new Response(JSON.stringify({ accessToken: 'invalid' }), { status: 200 }));
  await expect(new HttpAuthApi('https://api.example.invalid', fetcher).login(input)).rejects.toMatchObject({ code: 'unexpected' });
});
it('configuração inválida é rejeitada sem enviar credenciais', async () => {
  const fetcher = jest.fn((): Promise<Response> => Promise.reject(new Error('Não deve ser chamado.')));
  await expect(new HttpAuthApi(undefined, fetcher).login(input)).rejects.toMatchObject({ code: 'configuration' }); expect(fetcher).not.toHaveBeenCalled();
});
it('falha de transporte recebe mensagem de conexão', async () => {
  const fetcher: typeof fetch = () => Promise.reject(new TypeError('fetch failed'));
  await expect(new HttpAuthApi('https://api.example.invalid', fetcher).login(input)).rejects.toMatchObject({ code: 'network' });
});
it.each(['https://user:password@example.invalid', 'https://example.invalid?token=ficticio', 'https://example.invalid#fragment', 'ftp://example.invalid'])('URL ambígua não recebe credenciais: %s', async (url) => {
  const fetcher = jest.fn(() => Promise.resolve(new Response('{}'))); await expect(new HttpAuthApi(url, fetcher).login(input)).rejects.toMatchObject({ code: 'configuration' }); expect(fetcher).not.toHaveBeenCalled();
});
it('normaliza URL com prefixo de proxy e barra final', () => { expect(new HttpAuthApi('https://api.example.invalid/gabinete/').baseUrl).toBe('https://api.example.invalid/gabinete'); });
it('cancelamento da consulta aborta o transporte sem converter em sessão expirada', async () => {
  const controller = new AbortController(); const fetcher: typeof fetch = (_url, init) => new Promise((resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); });
  const pending = new HttpAuthApi('https://api.example.invalid', fetcher).get('/resource', z.object({ id: z.string() }), 'access-ficticio', controller.signal); const assertion = expect(pending).rejects.toMatchObject({ code: 'network' }); controller.abort(); await assertion;
});
it('timeout encerra requisição pendente e libera seu temporizador', async () => {
  jest.useFakeTimers(); try {
    const fetcher: typeof fetch = (_url, init) => new Promise((resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true }); });
    const pending = new HttpAuthApi('https://api.example.invalid', fetcher).current('access-ficticio'); const assertion = expect(pending).rejects.toMatchObject({ code: 'network' }); await jest.advanceTimersByTimeAsync(12000); await assertion; expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});
