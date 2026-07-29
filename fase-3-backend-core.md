# Fase 3 — Backend Core

**Período:** set/2026 · **Depende de:** Fase 2 · **Executa em paralelo com:** Fase 4 · **Bloqueia:** Fase 5 · **Marco:** M3

## Objetivo

Implementar a API real dos módulos core (RF00–RF04), substituindo o mock server módulo a módulo,
com regras de negócio testadas.

## Entregáveis

1. Módulos `users`, `routines`, `checklists`, `contacts`, `tasks` completos na API.
2. Testes de integração por módulo (Vitest + Supertest, banco de teste isolado).
3. OpenAPI e schemas `shared` atualizados a cada divergência descoberta.
4. Seed ampliado com dados de demonstração para a validação.

## Ordem de implementação (sequencial por dependência de domínio)

Cada módulo segue o mesmo ciclo: **schemas Zod (`shared`) → repository → service (regras) →
router → testes de integração → atualizar OpenAPI → avisar frontend que o endpoint real está disponível.**

### Módulo 1 — Users & perfil (~2 dias)

- CRUD de membros do gabinete (somente `CHEFE` gerencia), edição do próprio perfil, desativação (soft delete — nunca excluir usuário com tarefas/registros vinculados).

### Módulo 2 — Contacts (~2 dias) — *mais simples, valida o padrão de módulo*

- CRUD completo, busca por nome/órgão/tag (ILIKE + índice), tags livres, paginação por cursor.
- Campo `contatoChave: boolean` — marca contatos essenciais, consumidos pela seção "contatos-chave" do guia de transição (RF06, Fase 5).

### Módulo 3 — Routines (~3 dias)

- CRUD de rotinas com frequência (`DIARIA`, `SEMANAL`, `MENSAL`, `EVENTUAL`), passos ordenados, campo `essencialParaTransicao: boolean` (consumido pelo RF06 na Fase 5).
- Regra: rotina com checklist vinculado não pode ser excluída, apenas arquivada.

### Módulo 4 — Checklists (~4 dias) — *maior complexidade de negócio*

- `ChecklistTemplate` vinculado a uma rotina; geração de `ChecklistRun` por período (job diário simples via `node-cron` ou geração lazy no primeiro acesso do dia — decidir e registrar em ADR-006).
- Marcação de itens com autor e timestamp; percentual de conclusão; histórico consultável por período.
- Regras: não gerar run duplicado para o mesmo período; template alterado não afeta runs passados (snapshot dos itens no run).

### Módulo 5 — Tasks (~3 dias)

- CRUD com atribuição a membro, prazo, prioridade e transições de status válidas (`ABERTA → EM_ANDAMENTO → CONCLUIDA`; `CANCELADA` a partir de qualquer estado não concluído).
- Regras: apenas criador ou `CHEFE` reatribui/cancela; filtros por status, responsável e prazo; ordenação por prazo/prioridade.

## Paralelização

- Dentro da fase, os módulos são sequenciais (compartilham padrões e revisões aprendidas no módulo anterior).
- A fase inteira roda **em paralelo com a Fase 4**: o frontend consome mock e migra para o endpoint real assim que cada módulo é entregue (ordem de entrega acima foi escolhida para casar com a ordem de telas da Fase 4).

## Padrões obrigatórios (valem para todos os módulos)

- Validação de entrada com Zod em 100% dos endpoints (middleware de validação).
- Autorização verificada no service, não apenas no router.
- Toda listagem paginada por cursor; limite máximo de 100 itens.
- Erros de negócio com códigos estáveis (`ROUTINE_HAS_CHECKLIST`, `TASK_INVALID_TRANSITION`...).
- Nenhum acesso a Prisma fora dos repositories.

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| Regras de checklist mais complexas que o previsto | Módulo 4 tem a maior folga (4 dias); se estourar, geração lazy (mais simples) é o fallback decidido de antemão |
| Divergência entre API real e mock quebrar o frontend | Toda mudança de contrato atualiza `shared` + OpenAPI no mesmo PR; CI valida conformidade |

## Revisão e critérios de saída

- [ ] Todos os endpoints de RF00–RF04 implementados e conformes ao OpenAPI.
- [ ] Testes de integração cobrindo caminho feliz + regras de negócio + autorização de cada módulo.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` verdes — zero erros, zero warnings.
- [ ] Migrations aplicam do zero; seed de demonstração completo.
- [ ] Nenhum endpoint sem validação Zod ou sem verificação de autorização (auditoria manual da lista de rotas).
- [ ] Frontend notificado e migrado do mock para a API real em todos os módulos core.
- [ ] ADR-006 (geração de checklist runs) registrada.
