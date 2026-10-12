# Gabinete+

Aplicativo mobile e API para gestão de rotinas administrativas em gabinetes de desembargadores.

## Preparação

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
Set-ExecutionPolicy -Scope Process Bypass
.\bootstrap.ps1
```

## Uso diário

```powershell
docker compose up -d
pnpm dev:api
pnpm dev:mobile
```

## Verificação completa

```powershell
pnpm check
```

O contrato compartilhado é compilado automaticamente pelos comandos da raiz.
Após alterações no Prisma, execute `pnpm db:generate` antes da verificação.

Para validar os fluxos com PostgreSQL real, configure `TEST_DATABASE_URL` e execute
`pnpm test:integration`. Esse comando exige o banco de teste e é uma etapa obrigatória
do CI. Consulte [os testes de integração da API](docs/testes-integracao-api.md).

## Usuários de demonstração

Consulte [usuários e permissões](docs/usuarios-e-permissoes.md) para migrations,
seed com senha local e regras de cargos. A API expõe `/health` e os endpoints
`POST /auth/login`, `/auth/refresh` e `/auth/logout`.
Configure a chave JWT e consulte [autenticação](docs/autenticacao.md) antes de iniciar.
GET `/auth/me` consulta o acesso atual. GET `/users/:id/permissions` é restrito à
chefia. As rotas protegidas verificam sessão e perfil atuais. A [gestão de usuários](docs/gestao-usuarios.md)
inclui cadastro administrativo, edição de perfil, histórico de cargos e desativação.

O módulo [rotinas e atividades](docs/rotinas-atividades.md) oferece consulta,
cadastro, edição e arquivamento em `/routines`, com seed fictício.

[Checklists](docs/checklists.md) têm modelos versionados, execução por período,
marcação com autoria, progresso e histórico em `/checklists`.

[Contatos institucionais](docs/contatos.md) oferecem busca, tags, contatos-chave,
cadastro, edição e arquivamento em `/contacts`.

[Tarefas](docs/tarefas.md) têm atribuição, prazos, prioridades, histórico e
transições de status em `/tasks`.

## Documentação da API

Com a API local em execução, abra [a documentação interativa](http://localhost:3333/docs/).
O contrato também está disponível em `/docs/openapi.json` e `/docs/openapi.yaml`.
Consulte [o guia OpenAPI](docs/api-openapi.md) para autenticação, exemplos, permissões
e atualização dos schemas com `pnpm docs:generate`.

A documentação cobre os endpoints implementados de RF00–RF05. RF06
permanece planejado. A interface local fica desabilitada em produção.

## Login no aplicativo

O app possui login integrado à API, rotas protegidas e recuperação da sessão com
armazenamento seguro no Android/iOS. Configure `apps/mobile/.env` e consulte
[o guia do login mobile](docs/login-mobile.md). No navegador, a sessão fica em memória.
O perfil e a saída ficam disponíveis na área protegida. RF00–RF05 possuem fluxos
mobile de consulta, manutenção e execução integrados à API.

[Rotinas no aplicativo](docs/rotinas-mobile.md) já possuem catálogo, busca, filtros,
detalhes e manutenção pela chefia, com passos ordenados e arquivamento confirmado.

A tela [Hoje](docs/dashboard-mobile.md) exibe tarefas pendentes próprias e rotinas
do dia obtidas da API, com atalhos para consultas paginadas e perfil.

Consulte [contatos mobile](docs/contatos-mobile.md), [checklists mobile](docs/checklists-mobile.md),
[tarefas mobile](docs/tarefas-mobile.md), [acessibilidade](docs/acessibilidade.md),
[testes mobile](docs/testes-mobile.md) e [integração/limitações](docs/integracao-mobile-api.md).

Para recriar os cenários fictícios, veja [demonstração](docs/demonstracao.md).
O [guia de operação e continuidade](docs/operacao-e-transicao.md) reúne instalação,
configuração, manutenção e backup/restauração verificável. Componentes estão documentados
em [src/components](apps/mobile/src/components/README.md). RF06 e validação em aparelhos
seguem pendentes. O núcleo RF00–RF04 foi integrado à main pelo PR #97.
