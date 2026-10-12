import { HttpAuthApi } from './api';
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
