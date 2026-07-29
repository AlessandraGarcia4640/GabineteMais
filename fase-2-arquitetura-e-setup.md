# Fase 2 — Arquitetura e Setup Técnico (Trilha B — Engenharia)

**Período:** ago/2026 · **Depende de:** Fase 0 · **Executa em paralelo com:** Fase 1 · **Bloqueia:** Fases 3 e 4 · **Marco:** M2

## Objetivo

Montar a fundação técnica completa: monorepo, tooling, banco de dados, contrato de API,
autenticação e CI — de modo que as Fases 3 e 4 comecem a produzir funcionalidades no primeiro dia.

## Entregáveis

1. Monorepo funcional com CI verde.
2. Contrato **OpenAPI 3.1 v1** cobrindo RF00–RF06 + **mock server** rodando a partir dele.
3. Schema Prisma inicial + migrations do modelo de domínio da Fase 0.
4. Autenticação completa (registro por convite, login, refresh, RBAC).
5. `docs/adr/` com as decisões de arquitetura registradas (ADRs).
6. App Expo esqueleto (navegação por abas, tema com tokens da Fase 1, cliente HTTP tipado).

## Estrutura do monorepo

```
gabinete-plus/
├── CLAUDE.md
├── ROADMAP.md
├── planos/                   # planos de implementação por fase (este diretório)
├── docs/                     # requisitos, ADRs, design
├── packages/
│   └── shared/               # schemas Zod + tipos compartilhados (fonte única de verdade)
├── apps/
│   ├── api/                  # Express 5 + TypeScript
│   │   └── src/
│   │       ├── modules/<dominio>/   # router, service, repository, schemas por módulo
│   │       ├── middleware/          # auth, rbac, error-handler, request-logger
│   │       ├── lib/                 # prisma client, config (env validado com Zod)
│   │       └── server.ts
│   └── mobile/               # Expo + Expo Router
│       └── src/
│           ├── app/          # rotas (Expo Router, file-based)
│           ├── components/   # componentes do design system
│           ├── features/<dominio>/  # hooks, telas, api-hooks por módulo
│           └── lib/          # api client, query client, auth storage
├── openapi/gabinete-plus.yaml
└── docker-compose.yml        # postgres 16
```

## Plano de execução

### Etapa 2.1 — Bootstrap (sequencial, ~3 dias)

1. Criar repositório GitHub; monorepo com **pnpm workspaces**; Node LTS fixado via `.nvmrc`.
2. Tooling raiz: TypeScript strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint flat config + typescript-eslint, Prettier, EditorConfig.
3. `docker-compose.yml` com Postgres 16; `.env.example` documentado; validação de env com Zod no boot da API (falha rápida se variável ausente).
4. CI (GitHub Actions): jobs de `typecheck`, `lint`, `test` e `prisma migrate diff` em cada PR. Branch `main` protegida.

### Etapa 2.2 — Contrato e dados (sequencial, ~4 dias)

5. Escrever `openapi/gabinete-plus.yaml` a partir do rascunho da Fase 0: recursos REST por módulo (`/auth`, `/users`, `/routines`, `/checklists`, `/contacts`, `/tasks`, `/guidelines`, `/transition-guide`), paginação por cursor, envelope de erro padrão (`{ error: { code, message, details? } }`).
6. Definir schemas Zod em `packages/shared` espelhando o contrato (request/response por endpoint). O OpenAPI é gerado/verificado a partir dos schemas para evitar divergência.
7. Subir **mock server** (ex.: Prism) servindo o contrato — este é o desbloqueio da Fase 4.
8. Modelar `schema.prisma` conforme o modelo de domínio; primeira migration; script de **seed** com dados fictícios realistas (1 gabinete, 5 usuários, rotinas típicas de gabinete).

### Etapa 2.3 — Autenticação e esqueleto (paralelizável, ~1 semana)

- **[A] API — Auth completo:**
  - Registro por convite (chefe convida assessores por e-mail — sem cadastro aberto), login com Argon2id, JWT access (15 min) + refresh token rotativo (7 dias, revogável, persistido com hash).
  - Middleware `requireAuth` e `requireRole('CHEFE' | ...)`; testes de integração dos fluxos (login ok, senha errada, token expirado, refresh rotation, acesso negado por perfil).
  - Error handler central + logger estruturado (pino) + rate limit no `/auth`.
- **[B] Mobile — Esqueleto:**
  - App Expo com TypeScript strict, Expo Router com grupo `(auth)` e grupo `(app)` com abas.
  - Cliente HTTP tipado (fetch + schemas do `shared`), TanStack Query configurado, armazenamento seguro de tokens (`expo-secure-store`), interceptor de refresh.
  - Tema base consumindo tokens da Fase 1 (usar defaults provisórios se a Fase 1 ainda não congelou — trocar depois é só atualizar tokens).

**[A] e [B] são independentes** — podem ser intercalados ou feitos por pessoas diferentes.
**[B] depende apenas do mock server (passo 7)**, não do auth real.

### ADRs a registrar nesta fase

- ADR-001: Monolito modular vs. microserviços (decisão: monolito — KISS/YAGNI para protótipo).
- ADR-002: Prisma vs. Drizzle (decisão: Prisma — maturidade, migrations, DX).
- ADR-003: Contract-first com OpenAPI + Zod compartilhado (habilita paralelização front/back).
- ADR-004: JWT com refresh rotativo vs. sessão server-side.
- ADR-005: Expo managed workflow vs. bare React Native.

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| Contrato OpenAPI incompleto travar a Fase 4 | Contrato é versionado; mudanças passam por PR que atualiza `shared` + mock juntos |
| Overengineering na fundação | Limite: nada além do listado nos entregáveis; recursos extras (cache, filas, websockets) só se um RF exigir |

## Revisão e critérios de saída

- [ ] `pnpm typecheck && pnpm lint && pnpm test` verdes na raiz — zero erros e **zero warnings**.
- [ ] CI executa e bloqueia merge em falha.
- [ ] Contrato OpenAPI cobre todos os endpoints de RF00–RF06 e valida sem erros.
- [ ] Mock server responde todos os endpoints com exemplos plausíveis.
- [ ] Migrations aplicam do zero em banco limpo (`prisma migrate reset` funciona) e o seed roda.
- [ ] Fluxos de auth cobertos por testes de integração (mínimo: 6 cenários da etapa 2.3-A).
- [ ] App esqueleto abre no Expo Go, navega entre abas e autentica contra a API real.
- [ ] Todas as 5 ADRs escritas.
- [ ] Nenhum segredo commitado (verificação com gitleaks ou equivalente no CI).
