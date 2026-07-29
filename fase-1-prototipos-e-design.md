# Fase 1 — Protótipos e Design (Trilha A — Produto/UX)

**Período:** ago–set/2026 · **Depende de:** Fase 0 · **Executa em paralelo com:** Fase 2 · **Bloqueia:** Fase 4 · **Marco:** M1

## Objetivo

Produzir os protótipos de baixa e alta fidelidade (objetivo específico 4 do TCC) e o mini design
system que guiará a implementação do app, validando a experiência antes de escrever código de UI.

## Entregáveis

1. Protótipo de **baixa fidelidade** (wireframes Figma) de todas as telas do inventário da Fase 0.
2. Protótipo de **alta fidelidade navegável** (Figma) dos fluxos core.
3. Mini design system: tokens (cores, tipografia, espaçamento), componentes base (botão, input, card, lista, badge de status, checkbox), estados (vazio, carregando, erro).
4. `docs/design-decisions.md` — decisões de UX e justificativas.
5. Relatório de validação do protótipo com usuários (2+ participantes).

## Plano de execução

### Etapa 1.1 — Baixa fidelidade (~2 semanas, sequencial)

1. Definir arquitetura de informação: navegação por abas — `Hoje` (checklists e tarefas do dia), `Rotinas`, `Tarefas`, `Contatos`, `Gabinete` (orientações + transição + perfil).
2. Wireframes dos fluxos, nesta ordem de prioridade:
   - Autenticação (login, primeiro acesso, recuperação de senha)
   - Rotinas (listar por frequência, detalhar, criar/editar)
   - Checklists (execução do dia com progresso, histórico)
   - Tarefas (kanban simples ou lista por status; atribuir; concluir)
   - Contatos (busca, detalhe, criar/editar, tags)
   - Orientações (categorias, leitura, edição)
   - Transição de chefia (guia estruturado em seções, modo leitura para o sucessor)
3. Walkthrough dos wireframes com 1–2 usuários; ajustar.

### Etapa 1.2 — Alta fidelidade (~2 semanas, sequencial após 1.1)

4. Definir tokens visuais (paleta sóbria/institucional, contraste WCAG AA, tipografia legível).
5. Construir componentes no Figma e aplicar aos fluxos core (auth, rotinas, checklists, tarefas).
6. Montar protótipo navegável (Figma prototype) do caminho feliz de cada RF.
7. Sessão de validação com 2+ usuários-alvo: tarefa guiada + observação + SUS simplificado.
8. Consolidar ajustes e congelar o design core (mudanças posteriores viram backlog).

### Paralelização interna

- A partir da etapa 1.2, telas já aprovadas em alta fidelidade podem ser **liberadas
  incrementalmente para a Fase 4** (frontend), sem esperar o pacote completo.
- A validação (passo 7) pode ocorrer enquanto telas secundárias (orientações, transição) ainda
  estão sendo finalizadas.

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| Perfeccionismo no Figma atrasar a Fase 4 | Timebox de 4 semanas; alta fidelidade apenas dos fluxos core, telas secundárias podem ir direto do wireframe para o design system |
| Design ignorar limitações do React Native | Usar componentes compatíveis com o design system definido; revisar viabilidade técnica com a visão da Fase 2 antes de congelar |

## Revisão e critérios de saída

- [ ] Toda tela do inventário da Fase 0 tem wireframe.
- [ ] Todos os fluxos core (RF00–RF04) têm alta fidelidade navegável.
- [ ] Estados de vazio, carregando e erro definidos para cada listagem.
- [ ] Contraste validado (WCAG AA) nos tokens de cor.
- [ ] Protótipo validado com ao menos 2 usuários e ajustes registrados.
- [ ] Design congelado comunicado à Fase 4 (handoff com specs de espaçamento/tipografia).
- [ ] Nenhuma tela pressupõe funcionalidade fora do escopo v1.
