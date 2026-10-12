# Gabinete+

Aplicativo mobile e API para gestão de rotinas administrativas em gabinetes de desembargadores.

## Preparação

```powershell
Copy-Item .env.example .env
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

A documentação cobre os endpoints implementados de RF00–RF04. RF05 e RF06
permanecem planejados. A interface local fica desabilitada em produção.

## Login no aplicativo

O app possui login integrado à API, rotas protegidas e recuperação da sessão com
armazenamento seguro no Android/iOS. Configure `apps/mobile/.env` e consulte
[o guia do login mobile](docs/login-mobile.md). No navegador, a sessão fica em memória.
Após entrar, esta etapa mostra identidade, perfil e saída; as demais telas core
serão implementadas nas próximas etapas da Fase 4.
