# Fase 0 — Requisitos e Fundação

**Período:** jul–ago/2026 · **Depende de:** — · **Bloqueia:** Fases 1 e 2 · **Marco:** M0

## Objetivo

Transformar os objetivos do TCC em requisitos concretos e priorizados, mapear as rotinas reais
dos gabinetes e preparar todo o material que as trilhas de design (Fase 1) e engenharia (Fase 2)
consumirão. Nada de código nesta fase.

## Entregáveis

1. `docs/requisitos.md` — requisitos funcionais e não funcionais detalhados, com critérios de aceite por requisito.
2. `docs/mapa-de-rotinas.md` — rotinas diárias, semanais, mensais e eventuais de um gabinete (objetivo específico 1 do TCC).
3. `docs/personas-e-jornadas.md` — personas (chefe de gabinete novo, chefe experiente, assessor, equipe de apoio) e jornadas críticas, incluindo a jornada de transição de chefia (objetivo específico 2).
4. `docs/modelo-de-dominio.md` — glossário e modelo conceitual de entidades (ver seção abaixo).
5. Backlog priorizado (GitHub Projects) com épicos por RF e itens rotulados por fase.
6. Agenda preliminar das sessões de validação da Fase 6 (compromisso verbal dos participantes).

## Plano de execução

### Etapa 0.1 — Levantamento (sequencial, ~2 semanas)

1. Consolidar fontes: Manual de Boas Práticas do TJMG (2024), Wiedemann Neto (2009), Zanon Junior (2017), rotinas do gabinete da autora (TRT-9).
2. Entrevistar 3–5 chefes de gabinete/assessores (roteiro semiestruturado): rotinas, dores na transição, ferramentas atuais.
3. Registrar cada rotina no formato: nome, frequência, gatilho, responsável típico, passos, artefatos, riscos se não executada.

### Etapa 0.2 — Especificação (sequencial, ~1 semana)

4. Derivar requisitos funcionais dos achados; escrever critérios de aceite no formato "Dado/Quando/Então".
5. Definir o modelo de domínio conceitual:

   | Entidade | Descrição resumida |
   |----------|--------------------|
   | `User` | Usuário com perfil: `CHEFE`, `ASSESSOR`, `APOIO` |
   | `Routine` | Rotina administrativa com frequência (`DIARIA`, `SEMANAL`, `MENSAL`, `EVENTUAL`), descrição, passos |
   | `ChecklistTemplate` / `ChecklistRun` / `ChecklistItem` | Modelo de checklist vinculado a rotina; execuções periódicas; itens marcáveis |
   | `Contact` | Contato institucional (nome, órgão, cargo, telefones, e-mail, observações, tags) |
   | `Task` | Tarefa com título, descrição, responsável, prazo, prioridade, status (`ABERTA`, `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`) |
   | `Guideline` | Orientação operacional (título, categoria, conteúdo rico, anexos, versão) |
   | `TransitionGuide` | Guia de transição: seções ordenadas que agregam rotinas, orientações, contatos e pendências marcados como essenciais |

6. Priorizar backlog: MoSCoW (Must = RF00–RF04; Should = RF05–RF06; Could = notificações locais, exportação PDF do guia de transição; Won't v1 = integração com PJe/e-Gestão, multi-gabinete, IA).

### Etapa 0.3 — Preparação das fases seguintes (paralelizável, ~1 semana)

- **[A]** Criar inventário de telas necessárias (input da Fase 1) a partir das jornadas.
- **[B]** Rascunhar o contrato de API por módulo (input da Fase 2): recursos, operações, payloads principais.
- **[C]** Pré-agendar as sessões de validação de novembro com os entrevistados.

As três atividades são independentes entre si e podem ser intercaladas livremente.

## Fora do escopo v1 (registrar e não fazer)

Integração com sistemas processuais (PJe, e-Gestão, eproc), gestão de múltiplos gabinetes,
controle de frequência/ponto, IA para minutas, notificações push remotas.

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| Entrevistados indisponíveis em julho (férias forenses) | Começar pelos colegas do próprio gabinete; complementar com fontes documentais |
| Mapeamento de rotinas ficar genérico demais | Validar o mapa com ao menos 1 chefe de gabinete externo ao TRT-9 |

## Revisão e critérios de saída (obrigatório antes de encerrar a fase)

- [ ] Todos os 6 objetivos específicos do TCC têm rastreabilidade para ao menos um requisito ou atividade do roadmap.
- [ ] Cada RF possui critérios de aceite testáveis.
- [ ] O modelo de domínio cobre todos os RFs (verificação cruzada RF ↔ entidades).
- [ ] Mapa de rotinas cobre as 4 frequências (diária, semanal, mensal, eventual).
- [ ] Backlog priorizado e sem itens órfãos (todo item pertence a um épico/RF).
- [ ] Sessões de validação de novembro pré-agendadas.
- [ ] Nenhum requisito depende de item listado em "Fora do escopo v1".
