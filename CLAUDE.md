# CLAUDE.md — Gabinete+

App mobile (Expo/React Native) + API (Express 5) para gestão de rotinas de gabinetes de
desembargadores. Protótipo de TCC com entrega em dez/2026. Monorepo pnpm com TypeScript
estrito ponta a ponta.

## Mapa do projeto

- `ROADMAP.md` — guia mestre; fases e dependências. Consulte antes de iniciar trabalho novo.
- `planos/fase-N-*.md` — plano da fase atual: escopo, ordem de execução e critérios de saída.
- `docs/requisitos.md` — requisitos e critérios de aceite (fonte de verdade do escopo).
- `docs/adr/` — decisões de arquitetura. Decisões novas exigem ADR nova; não contrarie ADRs existentes sem registrar substituição.
- `packages/shared/` — schemas Zod e tipos compartilhados. **Única fonte de verdade de contratos**: toda mudança de payload começa aqui e atualiza `openapi/gabinete-plus.yaml` no mesmo PR.
- `apps/api/src/modules/<dominio>/` — router → service → repository. Regras de negócio no service; Prisma apenas em repositories.
- `apps/mobile/src/` — `app/` (rotas Expo Router), `features/<dominio>/`, `components/` (design system), `lib/`.

## Comandos

```bash
pnpm install                 # raiz do monorepo
docker compose up -d         # Postgres 16 local
pnpm -F api prisma migrate dev   # aplicar migrations
pnpm -F api seed             # dados fictícios de demonstração
pnpm -F api dev              # API em watch mode
pnpm -F mobile start         # Expo dev server
pnpm typecheck && pnpm lint && pnpm test   # verificação completa (rodar antes de qualquer entrega)
```

## Regras de código (invioláveis)

- TypeScript strict. **Proibido `any`, `unknown` como escape, `as` sem justificativa, `@ts-ignore`/`@ts-expect-error` e supressões de lint.** Se o tipo é difícil, modele o tipo.
- Zero erros e **zero warnings** de typecheck/lint/testes antes de qualquer commit. Não existe warning "de baixa prioridade".
- Validação Zod em 100% dos endpoints (entrada) e formulários (React Hook Form + resolver Zod com schemas do `shared`).
- Autorização verificada no **service**, nunca apenas no router. Perfis: `CHEFE`, `ASSESSOR`, `APOIO`.
- Listagens sempre paginadas (cursor, máx. 100) e no app sempre com estados vazio/carregando/erro.
- Erros de negócio com código estável no envelope `{ error: { code, message, details? } }`.
- Dados sensíveis: nunca commitar segredos; tokens só em `expo-secure-store`; apenas dados fictícios em seeds/testes/screenshots (contexto judiciário — LGPD).
- Textos de UI centralizados em `apps/mobile/src/lib/strings.ts`, em português institucional.
- Listas longas usam FlashList; dados remotos só via TanStack Query; estado de cliente em Zustand.

## Fluxo de trabalho

1. Localize a fase atual no `ROADMAP.md` e trabalhe apenas no escopo do plano dessa fase. Funcionalidade fora do plano → registrar em backlog v2, não implementar.
2. Para cada módulo/fluxo, siga o ciclo do plano da fase (schemas → implementação → testes → contrato atualizado).
3. Antes de declarar qualquer tarefa concluída: rode `pnpm typecheck && pnpm lint && pnpm test`, verifique runtime (API sobe; app abre e o fluxo alterado funciona) e confira o checklist de "Revisão e critérios de saída" da fase.
4. Commits pequenos e descritivos (convencional: `feat(api): ...`, `fix(mobile): ...`). PRs passam no CI antes de merge.
5. Mudou contrato de API? `packages/shared` + OpenAPI + mock + consumidores no **mesmo PR**.

## Armadilhas conhecidas

- Templates de checklist alterados não podem afetar `ChecklistRun`s passados (runs guardam snapshot dos itens).
- Rotina com checklist vinculado não é excluída — apenas arquivada. Usuário com registros vinculados não é excluído — apenas desativado.
- Transições de status de tarefa são restritas (`ABERTA → EM_ANDAMENTO → CONCLUIDA`; `CANCELADA` de qualquer estado não concluído) — valide no service.
- Snapshot do guia de transição é **imutável** após gerado.
- Refresh tokens são rotativos e persistidos com hash — nunca armazenar em claro.
