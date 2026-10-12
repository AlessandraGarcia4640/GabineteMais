# Integração mobile/API — etapa 43

## Ambiente

API usa API_PORT (padrão 3333), DATABASE_URL e JWT_ACCESS_SECRET de ao menos 32 caracteres. EXPO_PUBLIC_API_URL deve apontar para a mesma API acessível pelo dispositivo/navegador. No navegador local pode ser http://localhost:3333; aparelho físico exige endereço acessível na rede, com porta liberada. Prefixo de proxy é aceito. A URL não pode ter credenciais, query ou fragmento. Variáveis EXPO_PUBLIC são públicas no bundle e não devem conter segredos; depois de alterar URL, recarregue o desenvolvimento e gere novamente os bundles distribuídos.

Migrations e client Prisma devem estar atualizados. /health confirma processo HTTP, não substitui teste de conexão ao banco. CORS atual é aberto; TLS, allowlist de origens e endurecimento de implantação continuam necessários antes de produção. HTTP é usado em desenvolvimento/testes; produção deve oferecer HTTPS.

## Evidências por fluxo

| Fluxo | Testes contra Express/PostgreSQL |
| --- | --- |
| RF00 sessão/renovação/logout/perfil | mobile-auth.integration, auth/refresh/RBAC |
| RF01 rotinas | mobile-routines.integration |
| RF02 modelos, snapshots, marcação | mobile-checklists.integration |
| RF03 contatos | mobile-contacts.integration |
| RF04 atribuição, estados, histórico | mobile-tasks.integration |
| Jornada combinada e recuperação de rede/contrato | mobile-journey.integration |

O cliente HTTP real valida respostas pelos schemas compartilhados. A jornada combinada cria rotina, contato, modelo, execução e tarefa; simula indisponibilidade do transporte e resposta incompatível, confirma recuperação sem perder sessão, conclui o checklist/tarefa e preserva vínculos/snapshots após arquivo. Erros de timeout/cancelamento e URLs inválidas têm testes mobile próprios. CI executa as integrações duas vezes em bancos isolados.

## Inconsistências e limites registrados

- URL com credenciais/query/fragmento antes era aceita: corrigido no cliente, rejeitando configuração antes de enviar credenciais.
- RF05 implementa orientações com busca, Markdown, manutenção pela chefia e histórico preservado. RF06 agrega seis seções e cópias preservadas. O aceite completo ainda depende da validação em aparelhos e com usuários.
- Núcleo RF00–RF04 tem integração automatizada, mas execução em aparelhos Android/iOS, build distribuível e revisão com usuários/Figma seguem pendentes.
- Checklist para outra pessoa pode ser iniciado pela API; a UI de tarefas vincula execuções já criadas. Não há fila offline nem controle de versão de campos concorrentes.
- Testes de transporte não comprovam conectividade Wi-Fi, certificados, políticas HTTP dos builds nativos ou uso de rede em aparelhos. Esses itens requerem validação manual no ambiente de demonstração.

Reprodução: configurar banco de teste separado e TEST_DATABASE_URL; `pnpm check`, `pnpm test:integration`, `pnpm build` e exportação mobile. As fixtures criam/apagam somente seus bancos isolados; não aponte a infraestrutura de teste para produção.
