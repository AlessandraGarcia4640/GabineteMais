# Login no aplicativo — etapa 34

## Preparação

Prepare e inicie a API conforme README: PostgreSQL, migrations, seed fictício e JWT_ACCESS_SECRET. No diretório `apps/mobile`, copie `.env.example` para `.env` e configure `EXPO_PUBLIC_API_URL` com o endereço acessível ao aparelho.

- Aparelho físico: use o IP do computador na mesma rede.
- Emulador Android padrão: use `http://10.0.2.2:3333` para alcançar a API do computador.
- Navegador no computador: use `http://localhost:3333`.
- Fora da rede de desenvolvimento, disponibilize a API por HTTPS.

Reinicie o Expo após mudar a configuração. Da raiz:

```powershell
pnpm dev:api
pnpm dev:mobile
```

Os dois comandos rodam em terminais separados. Abra o app no Expo Go, informe um e-mail fictício do seed (por exemplo `assessor1@example.invalid`) e a senha escolhida em DEMO_SEED_PASSWORD. O app não disponibiliza cadastro público; a chefia gerencia os membros pela API.

## Comportamento

O formulário valida e-mail e senha, permite mostrar/ocultar a senha, desabilita campos e envio durante a requisição e apaga a senha após a tentativa. Falhas de credenciais, conexão, limite de tentativas, configuração ou armazenamento recebem mensagens institucionais. Detalhes internos retornados pelo servidor não são exibidos.

Após entrar, a área protegida mostra nome, perfil e opção de sair. Access token fica em memória. No Android/iOS, o refresh token é salvo com expo-secure-store e permite recuperar a sessão ao reabrir; cada recuperação rotaciona o token. O prazo absoluto de sete dias vem da API. Token vencido, revogado ou associado a outra origem volta ao login.

Renovações simultâneas são deduplicadas e não usam retries automáticos. Quando necessário, uma chamada protegida tenta renovar e repetir uma única vez. Ao retornar ao primeiro plano, o perfil atual é consultado no servidor. Se a recuperação falhar por conexão, a área protegida fica bloqueada e oferece nova tentativa ou saída.

Sair limpa usuário e caches do aparelho e tenta revogar a sessão remota. Se estiver sem rede, o app informa que a saída ocorreu no aparelho; não afirma ter revogado a sessão no servidor. Falha ao apagar armazenamento seguro bloqueia a área protegida até recuperação. Senhas, tokens e dados de acesso não são salvos em AsyncStorage nem localStorage.

No navegador, a sessão fica apenas em memória e se encerra ao atualizar a página. Essa prévia não comprova persistência nativa. Os componentes e estilos foram implementados em português para este fluxo; a conferência final contra o Figma e a execução em aparelhos fazem parte da validação visual/distribuição.

## Verificação

```powershell
pnpm check
pnpm test:integration
pnpm --filter @gabinete-plus/mobile export:web
```

Jest + React Native Testing Library cobrem formulário, carregamento, mensagens, recuperação, perfil e saída. Testes de sessão cobrem armazenamento restrito, corrupção, expiração, origem, revogação, cache, concorrência e respostas tardias. A integração `mobile-auth.integration.test.ts` usa o transporte e gerenciador reais contra a API HTTP/PostgreSQL; somente o adaptador de armazenamento do aparelho é substituído por memória no teste.

Os bundles Android/iOS podem ser conferidos com `expo export --platform all --no-bytecode --output-dir dist-export` para validação de código. Isso não produz APK/IPA e não substitui execução no Expo Go ou dev build. `dist-export` é ignorado no Git. O CI executa os testes e exporta a versão web.

Referências: [SecureStore no SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/), [rotas protegidas](https://docs.expo.dev/router/advanced/authentication/) e [configuração Metro](https://docs.expo.dev/guides/customizing-metro/).
