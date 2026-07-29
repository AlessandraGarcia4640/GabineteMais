# ROADMAP — Gabinete+

> **Plataforma digital para otimização de rotinas em gabinetes de desembargadores.**
> Este arquivo é o guia mestre de implementação. Cada fase possui um plano detalhado em `planos/`.
> Escopo: protótipo funcional do TCC (Projeto Final II — UNISINOS), com entrega em dezembro/2026.

---

## 1. Visão do produto

Aplicativo mobile para auxiliar chefes de gabinete e assessores na organização das rotinas
administrativas e operacionais de um gabinete de desembargador, promovendo continuidade
administrativa, eficiência e redução da curva de aprendizagem em transições de gestão.

### Requisitos funcionais (escopo do protótipo)

| ID   | Requisito                                                        | Fase de entrega |
|------|------------------------------------------------------------------|-----------------|
| RF00 | Autenticação e perfis de usuário (chefe, assessor, apoio)        | Fases 3–4       |
| RF01 | Cadastro e organização de rotinas administrativas                 | Fases 3–4       |
| RF02 | Checklist de atividades periódicas (diária/semanal/mensal/eventual) | Fases 3–4    |
| RF03 | Registro de contatos institucionais                               | Fases 3–4       |
| RF04 | Distribuição e acompanhamento de tarefas                          | Fases 3–4       |
| RF05 | Armazenamento de orientações operacionais                         | Fase 5          |
| RF06 | Organização de informações para transição de chefia               | Fase 5          |

### Requisitos não funcionais (protótipo)

- **RNF01 — Segurança:** senhas com hash Argon2id, tokens JWT (access + refresh), RBAC por perfil, TLS em trânsito. Dados de contexto judicial exigem cuidado mínimo com LGPD mesmo em protótipo (dados fictícios nos testes).
- **RNF02 — Usabilidade:** interface validável por usuários não técnicos; fluxos com no máximo 3 níveis de navegação.
- **RNF03 — Qualidade de código:** TypeScript estrito ponta a ponta, zero erros e zero warnings de compilação/lint em todas as entregas.
- **RNF04 — Testabilidade:** cobertura de testes nas regras de negócio do backend e nos fluxos críticos do app.

---

## 2. Stack tecnológica (decisão fixada)

| Camada        | Tecnologia                                                        |
|---------------|-------------------------------------------------------------------|
| Mobile        | React Native via **Expo** (SDK estável vigente), TypeScript strict, Expo Router, TanStack Query (estado de servidor), Zustand (estado de cliente), React Hook Form + Zod (formulários) |
| Backend       | **Node.js LTS + Express 5 + TypeScript**, arquitetura monolito modular (rotas → serviços → repositórios), validação com Zod |
| Banco         | **PostgreSQL 16+** com **Prisma ORM** (migrations versionadas)    |
| Contrato API  | **OpenAPI 3.1** (contract-first) — habilita paralelização front/back |
| Testes        | Vitest + Supertest (backend), Jest + React Native Testing Library (app) |
| Infra local   | Docker Compose (Postgres); GitHub + GitHub Actions (CI)           |
| Design        | Figma (protótipos de baixa e alta fidelidade)                     |

Justificativa: TypeScript ponta a ponta permite compartilhar tipos e schemas Zod entre app e API
(pacote `shared/`), reduzindo erros de integração. Monolito modular segue KISS/YAGNI para o
escopo de protótipo, sem impedir evolução futura.

---

## 3. Fases e dependências

```
                     ┌──────────────────────────────────────────────────────────┐
                     │  TRILHA A — Produto/UX          TRILHA B — Engenharia    │
                     └──────────────────────────────────────────────────────────┘

  FASE 0  Requisitos e Fundação (jul–ago/2026)  ◄── ponto de partida único
     │
     ├───────────────► FASE 1  Protótipos e Design (ago–set)      [Trilha A]
     │                    │
     └───────────────► FASE 2  Arquitetura e Setup (ago)          [Trilha B]  ∥ paralela à Fase 1
                          │
                          ├────► FASE 3  Backend Core (set)                    ┐
                          │                                                    │ ∥ parcialmente
                          └────► FASE 4  Frontend Core (set–out)               ┘ paralelas via
                                   │        (depende da Fase 1 p/ telas e     contrato OpenAPI
                                   │         da Fase 2 p/ contrato/mocks)      + mock server
                                   ▼
                         FASE 5  Integração e Módulo de Transição (out–nov)
                                   ▼
                         FASE 6  Testes, Validação e Entrega (nov–dez)
```

### Regras de paralelização

1. **Fase 1 ∥ Fase 2**: design de alta fidelidade (Figma) e setup técnico não compartilham
   dependências — podem ocorrer simultaneamente após a Fase 0.
2. **Fase 3 ∥ Fase 4**: o contrato OpenAPI + schemas Zod compartilhados (entregues na Fase 2)
   permitem que o frontend seja construído contra um **mock server** enquanto o backend real é
   implementado. A integração real acontece de forma incremental: a cada módulo do backend
   concluído, o frontend troca o mock pelo endpoint real.
3. **Fases 5 e 6 são sequenciais**: integração total precisa de front+back prontos; validação
   com usuários precisa do app estável.

### Resumo das fases

| Fase | Nome | Período | Depende de | Plano detalhado |
|------|------|---------|------------|-----------------|
| 0 | Requisitos e Fundação | jul–ago/2026 | — | `planos/fase-0-requisitos-e-fundacao.md` |
| 1 | Protótipos e Design (Trilha A) | ago–set/2026 | Fase 0 | `planos/fase-1-prototipos-e-design.md` |
| 2 | Arquitetura e Setup (Trilha B) | ago/2026 | Fase 0 | `planos/fase-2-arquitetura-e-setup.md` |
| 3 | Backend Core | set/2026 | Fase 2 | `planos/fase-3-backend-core.md` |
| 4 | Frontend Core | set–out/2026 | Fases 1 e 2 | `planos/fase-4-frontend-core.md` |
| 5 | Integração e Módulo de Transição | out–nov/2026 | Fases 3 e 4 | `planos/fase-5-integracao-e-transicao.md` |
| 6 | Testes, Validação e Entrega | nov–dez/2026 | Fase 5 | `planos/fase-6-testes-validacao-entrega.md` |

O cronograma respeita o cronograma oficial do TCC (seção 6 do documento do projeto):
protótipos jul–set, arquitetura ago–set, desenvolvimento set–nov, testes e validação nov,
análise de resultados e entrega final em dez/2026.

---

## 4. Marcos (milestones)

| Marco | Critério objetivo de conclusão | Data-alvo |
|-------|-------------------------------|-----------|
| M0 — Requisitos congelados | Documento de requisitos aprovado; mapa de rotinas concluído; backlog priorizado | fim de ago/2026 |
| M1 — Design aprovado | Protótipo de alta fidelidade navegável no Figma, validado com ao menos 2 usuários-alvo | meados de set/2026 |
| M2 — Fundação técnica pronta | Monorepo com CI verde, contrato OpenAPI v1, banco migrado, auth funcionando | fim de ago/2026 |
| M3 — API core completa | Endpoints de RF00–RF04 com testes passando e documentação atualizada | fim de set/2026 |
| M4 — App core completo | Telas de RF00–RF04 integradas à API real | fim de out/2026 |
| M5 — Protótipo completo | RF05 e RF06 integrados; app estável de ponta a ponta | meados de nov/2026 |
| M6 — Validação concluída | Sessões com usuários realizadas, feedback registrado e ajustes críticos aplicados | fim de nov/2026 |
| M7 — Entrega final | Relatório de resultados, código versionado com tag `v1.0.0-tcc`, artigo final | dez/2026 |

---

## 5. Riscos globais e mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Autora desenvolve sozinha — paralelização entre trilhas vira intercalação | Alta | Médio | Planos indicam a ordem de intercalação recomendada quando não houver segunda pessoa |
| Escopo crescer além do protótipo (scope creep) | Alta | Alto | Qualquer requisito novo entra em "Fora do escopo v1" no plano da fase; só entra com corte equivalente |
| Dificuldade de recrutar usuários para validação | Média | Alto | Agendar sessões com antecedência na Fase 0 (a autora atua num gabinete do TRT-9 — rede direta) |
| Atraso no backend bloquear o frontend | Média | Médio | Contract-first + mock server desde a Fase 2 |
| Dados sensíveis em demonstrações | Baixa | Alto | Somente dados fictícios em todo o ciclo; seed de demonstração controlado |

---

## 6. Como usar este roadmap

1. Execute as fases na ordem do diagrama, respeitando dependências.
2. Antes de iniciar uma fase, leia o plano detalhado correspondente em `planos/`.
3. Ao final de cada fase, execute o **checklist de revisão** do plano (seção "Revisão e critérios de saída") — nenhuma fase é considerada concluída com itens pendentes.
4. O arquivo `CLAUDE.md` na raiz do repositório define as convenções de engenharia que valem para todas as fases.
