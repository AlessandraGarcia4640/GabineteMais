# Usuários e permissões — issue #23

## Preparação

Na raiz: copie `.env.example` para `.env`, instale dependências, execute
`pnpm db:generate`, inicie PostgreSQL e aplique as migrations.
Para instalações existentes use `pnpm --filter @gabinete-plus/api exec prisma migrate deploy`.
A segunda migration preserva usuários existentes e cria seu histórico inicial.
Ela impede dois cargos vigentes por pessoa, períodos invertidos e exclusão de pessoa
com histórico. Atualizações de cargo ainda serão expostas pela issue #27.

Configure `DEMO_SEED_PASSWORD` no ambiente local (12 a 128 caracteres) e execute
`pnpm db:seed`. O seed cria cinco contas fictícias com Argon2id, em uma transação.
Executá-lo novamente não altera senhas, nomes, perfis ou histórico já existentes.
Não é permitido executar esse seed com `NODE_ENV=production`.
Não publique a senha local no repositório.

Contas: `magistrado@example.invalid`, `chefia@example.invalid`,
`assessor1@example.invalid`, `assessor2@example.invalid`, `apoio@example.invalid`.
Essas contas podem usar POST /auth/login; configure JWT_ACCESS_SECRET conforme
`docs/autenticacao.md` antes de executar a API, o seed e os testes.

## Contratos e decisões

Veja ADR-002 para cargos, matriz de permissões, histórico e substituição temporária.
`shared` exporta contratos públicos de usuário e histórico, além de entrada de login.
O mobile reutiliza a mesma validação de login. Senha/hash não fazem parte da resposta pública.
O OpenAPI declara esses schemas e o endpoint de login da #24.

As funções de autorização devem ser chamadas pelos services com usuário lido do banco,
nunca com role/isActive enviados pelo cliente. A proteção de rotas foi aplicada na
#26, conforme ADR-005. Tarefas exigem também validar propriedade na implementação do módulo.

## Verificação

`pnpm check` verifica tipos, lint e testes de contratos, permissões e hash.
`pnpm db:generate` valida a geração do cliente a partir do schema.
Migrations e seed exigem adicionalmente PostgreSQL real. O teste de integração
usa exclusivamente `TEST_DATABASE_URL` e deve ser executado em banco descartável,
com as migrations aplicadas. Execute:

```powershell
$env:DATABASE_URL = $env:TEST_DATABASE_URL
pnpm --filter @gabinete-plus/api exec prisma migrate deploy
pnpm --filter @gabinete-plus/api exec vitest run src/modules/users/users.repository.integration.test.ts
```

O teste se recusa a usar a URL normal e aborta se encontrar usuários fora das cinco
contas fictícias. Nunca use um banco de trabalho ou produção para esse teste.
