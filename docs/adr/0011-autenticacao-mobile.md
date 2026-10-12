# ADR 0011 — Sessão e autenticação mobile

Status: aceita.

A etapa 34 integra diretamente a API real de autenticação. React Hook Form valida o login com Zod compartilhado; TanStack Query executa mutations/queries sem repetição automática de login, refresh ou logout. Textos de interface são centralizados, e a navegação usa as rotas protegidas do Expo Router.

Access token fica somente em memória privada do gerenciador de sessão. O store Zustand contém estado de navegação, usuário e código de mensagem, sem credenciais. Refresh token, validade absoluta e origem da API são guardados em uma única entrada de expo-secure-store no Android/iOS. Senha e perfil não são persistidos. A origem impede enviar uma credencial salva para outra API após mudar a configuração.

Ao reabrir o aplicativo, o refresh é rotacionado e persistido antes de habilitar a área autenticada. Solicitações simultâneas compartilham uma rotação; um 401 permite apenas uma tentativa de renovar e repetir. Reutilizações automáticas após falha de rede são evitadas, pois o servidor pode ter consumido o token sem entregar a resposta. A recuperação oferece tentativa manual ou retorno ao login.

Escritas locais são serializadas. Um contador de revisão impede respostas tardias de restaurarem a identidade após logout ou troca de usuário. Logout remove a identidade e cache locais e tenta revogar a sessão no servidor. Sem rede, informa que a saída foi local; a sessão remota conserva seu prazo até revogação/expiração. Se a remoção do armazenamento falhar, a área autenticada permanece bloqueada e exige recuperação.

O retorno ao primeiro plano consulta /auth/me para refletir sessão/perfil atuais. O navegador é uma prévia em memória: não há fallback para localStorage/AsyncStorage, e atualizar a página exige novo login. Persistência segura entre reinícios é uma capacidade nativa.

Os arquivos do cliente são módulos ESM para que o mesmo transporte/gerenciador seja testado contra a API em Node. Configurações CommonJS usam extensão .cjs. Metro tem fallback restrito aos imports relativos .js de src para resolver o fonte TypeScript; dependências instaladas preservam o resolver padrão. Jest unifica o React Native do aplicativo para evitar duplicação de mocks causada pelas variantes de peers do pnpm.

As demais telas core e onboarding por convite seguem nas próximas etapas da Fase 4. A área autenticada desta issue mostra somente identidade, perfil e saída.
