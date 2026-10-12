# Documentação da API — etapa 32

O contrato OpenAPI 3.1 está em `openapi/gabinete-plus.yaml`. Documenta os endpoints implementados de RF00–RF06: autenticação, equipe/perfis, atividades, checklists, contatos e tarefas. RF05 inclui orientações com versões imutáveis. RF06 inclui guia vivo por seção e cópias imutáveis com revisão esperada.

## Interface local

Prepare `.env` conforme `.env.example`, instale as dependências e gere o cliente Prisma. Para executar as operações de negócio, inicie PostgreSQL, aplique as migrations e prepare o seed fictício. Inicie a API com `pnpm dev:api` e abra:

- [Interface interativa](http://localhost:3333/docs/)
- [Contrato JSON](http://localhost:3333/docs/openapi.json)
- [Contrato YAML](http://localhost:3333/docs/openapi.yaml)

Se `API_PORT` for diferente, ajuste a porta. A interface e todos os seus recursos são servidos pela API; não dependem de CDN. O validador remoto está desativado e o token informado não é persistido pela interface. `/docs` fica desabilitado quando `NODE_ENV=production`.

O servidor resolve chamadas no mesmo endereço em que a documentação foi aberta. A documentação pode ser consultada sem conexão com o banco; executar operações protegidas exige o banco e uma sessão válida. Em distribuição da API compilada, preserve também o diretório `openapi/` na raiz do monorepo, além de `apps/api/dist` e dependências.

## Testar autenticação

1. Use `POST /auth/login` com um e-mail do seed e a senha que você definiu em `DEMO_SEED_PASSWORD`.
2. Copie o `accessToken` retornado e informe-o no botão **Authorize**, sem acrescentar `Bearer`.
3. Execute `GET /auth/me` para consultar o perfil e as permissões atuais.
4. Quando necessário, use `POST /auth/refresh` com o `refreshToken` no corpo. Substitua os dois tokens pelos valores recém-retornados e atualize o campo **Authorize**.
5. Use `POST /auth/logout` com o refresh token para revogar a sessão.

Access token dura 900 segundos. A sessão tem prazo absoluto de sete dias; renová-la não estende esse prazo. Refresh é rotativo: reutilizar um token consumido revoga a sessão. Logout é idempotente. Os tokens e senhas dos exemplos são fictícios e não autenticam.

## Permissões e contratos

| Operação | Regra |
| --- | --- |
| Consultar módulos core | Qualquer perfil ativo |
| Gerenciar membros, cargos, atividades, modelos de checklist e contatos | CHEFE |
| Editar o próprio perfil | Próprio usuário ativo |
| Executar checklist | Responsável ou CHEFE |
| Criar tarefa própria | Qualquer perfil ativo |
| Criar tarefa inicialmente atribuída a terceiro | CHEFE |
| Editar, reatribuir ou cancelar tarefa | Criador ou CHEFE |
| Iniciar e concluir tarefa | Responsável ou CHEFE |

O perfil e a sessão atuais são verificados no banco, inclusive dentro das transações de alteração. Um perfil antigo contido no JWT não concede acesso.

Listagens retornam `{ items, nextCursor }`, com limite padrão 20 e máximo 100. Siga `nextCursor` mantendo os filtros. Tarefas são ordenadas por prazo crescente, com nulos ao final, prioridade decrescente e id; o cursor delas é composto e opaco. As demais listagens usam cursor por id. Mudanças concorrentes podem mover registros entre páginas.

DELETE desativa membros, arquiva atividades/modelos/contatos ou cancela tarefas, preservando registros e histórico. Tarefas seguem `ABERTA → EM_ANDAMENTO → CONCLUIDA`; cancelamento parte de estados não concluídos. Um checklist vinculado precisa estar concluído antes da tarefa e não pode ser reaberto após essa conclusão.

Erros têm envelope `{ error: { code, message, details? } }`. `details` é opcional, usado em falhas de validação. São documentados erros de entrada, autenticação, autorização, conflito, limite de corpo de 1 MB, limitação de tentativas e falha interna. As rotas de login/refresh/logout limitam, respectivamente, 20/60/120 tentativas por IP em 15 minutos.

## Atualização e validação

Os schemas de payload e os parâmetros de consulta são gerados de `packages/shared` pelo catálogo em `apps/api/src/documentation/contracts.ts`. Após alterar um contrato:

```powershell
pnpm docs:generate
pnpm check
```

Revise também descrições de regras de negócio, exemplos e rotas. A geração de JSON Schema descreve tipos, limites, campos obrigatórios e defaults; refinements entre campos e normalizações Zod precisam ser explicados em texto. Os serviços continuam sendo a validação executável de autorização e negócio.

Os testes incluídos em `pnpm check` e no CI validam estrutura OpenAPI 3.1, referências locais, correspondência dos schemas/filtros com shared, cobertura de todas as rotas montadas, autenticação declarada, exemplos de entrada/saída/erro e funcionamento HTTP da documentação. O teste de cobertura considera as rotas de negócio; os recursos auxiliares de `/docs` são verificados separadamente.

Swagger UI usa os recursos do pacote [swagger-ui-dist](https://github.com/swagger-api/swagger-ui/blob/main/docs/usage/installation.md), servidos localmente. A estrutura do contrato é validada com Swagger Parser, sem buscar referências HTTP externas.
