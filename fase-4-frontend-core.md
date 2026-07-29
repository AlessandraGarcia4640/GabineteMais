# Fase 4 — Frontend Core

**Período:** set–out/2026 · **Depende de:** Fase 1 (telas) e Fase 2 (contrato/mock) · **Executa em paralelo com:** Fase 3 · **Bloqueia:** Fase 5 · **Marco:** M4

## Objetivo

Implementar as telas e fluxos core do app (RF00–RF04) em React Native/Expo, primeiro contra o
mock server e integrando à API real módulo a módulo conforme a Fase 3 entrega.

## Entregáveis

1. Design system implementado em código (componentes base tipados, tema, estados).
2. Fluxos completos: autenticação, Hoje, Rotinas, Checklists, Tarefas, Contatos.
3. Testes de componente dos fluxos críticos (RN Testing Library).
4. Build de desenvolvimento distribuível (EAS Build ou Expo Go) para validação interna.

## Plano de execução

### Etapa 4.1 — Design system em código (~1 semana, sequencial)

1. Implementar tokens da Fase 1 (tema tipado: cores, tipografia, espaçamento).
2. Componentes base: `Button`, `TextField`, `Card`, `ListItem`, `StatusBadge`, `Checkbox`, `EmptyState`, `ErrorState`, `LoadingState`, `Screen` (wrapper com safe area).
3. Storybook RN opcional — apenas se não atrasar (YAGNI: telas de exemplo servem).

### Etapa 4.2 — Fluxos por módulo (ordem casada com a Fase 3)

Cada fluxo segue o ciclo: **tela em alta fidelidade (Fase 1) → hooks de API (TanStack Query sobre o mock) → tela funcional → teste de componente → trocar mock pela API real quando o módulo da Fase 3 for entregue.**

| Ordem | Fluxo | Estimativa | Observações |
|-------|-------|-----------|-------------|
| 1 | Autenticação completa | 3 dias | Integra direto com API real (auth já pronto desde a Fase 2); onboarding por convite |
| 2 | Contatos | 3 dias | Lista com busca, detalhe, criar/editar, tags — valida o padrão de CRUD |
| 3 | Rotinas | 4 dias | Listagem por frequência (tabs/filtros), detalhe com passos, criar/editar |
| 4 | Checklists + aba Hoje | 5 dias | Execução do dia com progresso, marcação otimista (optimistic update com rollback), histórico |
| 5 | Tarefas | 4 dias | Lista por status, filtros, atribuição, transições de status, indicador de prazo |

### Paralelização

- **4.1 pode começar no dia 1 da fase**, em paralelo à Fase 3 e ao restante da Fase 1 (usa telas já congeladas).
- Fluxos 2 e 3 podem ser intercalados se as telas de ambos estiverem prontas.
- Trabalhando solo: recomenda-se intercalar 1 módulo de backend (Fase 3) → 1 fluxo correspondente aqui, mantendo integração contínua e evitando "big bang" no final.

## Padrões obrigatórios

- Todo dado remoto via TanStack Query com chaves de cache padronizadas (`['contacts', filters]`).
- Formulários com React Hook Form + resolver Zod (schemas do `packages/shared` — mesma validação do backend).
- Toda listagem trata os 3 estados: vazio, carregando, erro (componentes da etapa 4.1).
- Nenhum texto hardcoded fora de `src/lib/strings.ts` (facilita revisão de linguagem institucional).
- Proibido `any`/`unknown` e supressões de erro; navegação tipada (typed routes do Expo Router).

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| Fase 1 atrasar o congelamento de telas | Etapa 4.1 e fluxo de auth não dependem de telas finais; ordem dos fluxos pode ser reorganizada conforme o que estiver congelado |
| Optimistic updates dos checklists introduzirem bugs de sincronização | Padrão único de mutation com rollback documentado no primeiro uso; teste de componente cobrindo falha de rede |
| Performance em listas longas | FlashList em toda listagem desde o início (não migrar depois) |

## Revisão e critérios de saída

- [ ] Todos os fluxos RF00–RF04 funcionais contra a **API real** (mock desligado).
- [ ] Estados vazio/carregando/erro implementados em todas as listagens.
- [ ] Testes de componente dos fluxos de auth, checklist do dia e tarefas passando.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` verdes — zero erros, zero warnings; nenhum `any`/`unknown`.
- [ ] App roda em Android e iOS (Expo Go ou dev build) sem crash nos fluxos core.
- [ ] Fidelidade visual conferida contra o Figma (revisão lado a lado, tela por tela).
- [ ] Tokens de auth em `expo-secure-store` (nunca em AsyncStorage plano).
