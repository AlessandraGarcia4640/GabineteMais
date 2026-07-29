# Fase 5 — Integração e Módulo de Transição de Chefia

**Período:** out–nov/2026 · **Depende de:** Fases 3 e 4 · **Bloqueia:** Fase 6 · **Marco:** M5

## Objetivo

Entregar os dois módulos diferenciais do projeto — **orientações operacionais (RF05)** e
**guia de transição de chefia (RF06)** — e estabilizar o app de ponta a ponta. O RF06 é o coração
do TCC (preservação do conhecimento institucional): recebe fase própria para não ser espremido.

## Entregáveis

1. Módulo **Guidelines** (RF05): backend + frontend.
2. Módulo **TransitionGuide** (RF06): backend + frontend.
3. Guia de orientações estruturado (objetivo específico 3 do TCC) carregado como conteúdo inicial via seed.
4. App integrado de ponta a ponta, sem mocks, estável.

## Plano de execução

### Etapa 5.1 — Orientações operacionais / RF05 (~1 semana)

**Backend (2–3 dias):**
1. CRUD de `Guideline`: título, categoria (ex.: `SESSOES`, `PRAZOS`, `ATENDIMENTO`, `EQUIPE`, `MAGISTRADO`, `OUTROS`), conteúdo em texto rico (Markdown), campo `essencialParaTransicao`.
2. Versionamento simples: cada edição gera nova versão; histórico consultável (requisito de preservação de conhecimento — não sobrescrever destrutivamente).
3. Busca por título/categoria/conteúdo.

**Frontend (2–3 dias):**
4. Listagem por categoria com busca; leitura confortável (render Markdown); criação/edição com preview; indicação de versão e autor da última edição.

### Etapa 5.2 — Guia de transição de chefia / RF06 (~1,5 semana)

**Backend (3–4 dias):**
5. `TransitionGuide` como agregador estruturado em seções ordenadas: visão geral do gabinete (texto livre do chefe), rotinas essenciais (marcadas na Fase 3), orientações essenciais (marcadas em 5.1), contatos-chave, tarefas em aberto, anotações de transição.
6. Endpoint consolidado `GET /transition-guide` que monta o guia dinamicamente a partir das marcações — **sem duplicar dados**.
7. **Modo transição**: chefe pode gerar um snapshot versionado do guia (registro imutável de "estado do gabinete em DD/MM/AAAA") para entregar ao sucessor.
8. Exportação do snapshot em PDF ou Markdown (item "Could" — implementar apenas se dentro do prazo; decisão registrada no início da etapa).

**Frontend (3–4 dias):**
9. Tela do guia em modo leitura (persona: sucessor no primeiro dia) — navegação por seções, sem exigir conhecimento prévio do app.
10. Tela de curadoria (persona: chefe atual) — marcar/desmarcar itens essenciais, editar visão geral, gerar snapshot.

### Etapa 5.3 — Estabilização (~1 semana, sequencial após 5.1 e 5.2)

11. Passada de integração completa: executar as jornadas das personas da Fase 0 de ponta a ponta e registrar defeitos.
12. Corrigir defeitos por prioridade (bloqueante → alto → médio; baixos viram backlog).
13. Revisão de UX fina: mensagens de erro em linguagem institucional clara, textos revisados.
14. Preparar build de validação (EAS Build — APK Android no mínimo; iOS via TestFlight se houver tempo) + seed de demonstração completo e realista.

### Paralelização

- Dentro de 5.1 e 5.2, backend e frontend do mesmo módulo podem andar em paralelo via contrato (mesmo padrão das Fases 3∥4).
- 5.1 e 5.2 são paralelizáveis entre si com duas pessoas; solo, fazer 5.1 → 5.2 (o RF06 consome as marcações do RF05).
- 5.3 é estritamente sequencial após ambas.

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| RF06 crescer demais (é o módulo mais conceitual) | Escopo fechado nos 6 tipos de seção listados; qualquer ideia nova vai para backlog v2 |
| Estabilização revelar volume alto de defeitos | Integração contínua nas fases 3–4 reduz esse risco; semana 5.3 é dedicada exclusivamente a isso |
| Exportação PDF consumir tempo desproporcional | É "Could": timebox de 1 dia; fallback = compartilhar snapshot como Markdown |

## Revisão e critérios de saída

- [ ] RF05 e RF06 funcionais de ponta a ponta contra a API real.
- [ ] Snapshot de transição gera registro imutável e reabrível.
- [ ] Guia de transição navegável por usuário que nunca viu o app (teste informal com 1 pessoa).
- [ ] Todas as jornadas das personas da Fase 0 executadas sem defeito bloqueante ou alto.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` verdes — zero erros, zero warnings.
- [ ] Testes de integração dos módulos novos (versionamento de guideline; montagem e snapshot do guia).
- [ ] Build de validação instalável gerado e testado em dispositivo físico.
- [ ] Seed de demonstração cobre todos os RFs com dados fictícios plausíveis.
