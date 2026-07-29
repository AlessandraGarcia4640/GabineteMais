# Fase 6 — Testes, Validação com Usuários e Entrega Final

**Período:** nov–dez/2026 · **Depende de:** Fase 5 · **Marcos:** M6 e M7

## Objetivo

Cumprir os objetivos específicos 5 e 6 do TCC: verificar estabilidade, usabilidade e adequação
das funcionalidades (testes funcionais) e **validar a solução com usuários reais** (chefes de
gabinete e assessores), consolidando os resultados para o artigo final.

## Entregáveis

1. Plano e relatório de testes funcionais (`docs/testes/plano-de-testes.md`, `docs/testes/relatorio.md`).
2. Protocolo e relatório de validação com usuários (`docs/validacao/`).
3. Ajustes críticos aplicados; backlog v2 documentado.
4. Repositório final com tag `v1.0.0-tcc`; material para as considerações finais do artigo.

## Plano de execução

### Etapa 6.1 — Testes funcionais (~1 semana, início de nov)

1. Derivar casos de teste dos critérios de aceite da Fase 0 (rastreabilidade RF → caso de teste).
2. Executar a matriz: Android (dispositivo físico + emulador) e iOS (se disponível); rede lenta e modo offline (comportamento gracioso: mensagens claras, sem crash); dados extremos (listas vazias, textos longos, muitos itens).
3. Testes de segurança básicos: acesso sem token, token expirado, escalação de perfil (assessor tentando ações de chefe), injeção nos campos de busca.
4. Registrar defeitos com severidade; corrigir bloqueantes e altos; re-testar.

### Etapa 6.2 — Validação com usuários (~2 semanas, meados de nov) — sessões já pré-agendadas na Fase 0

5. **Protocolo** (definir antes da primeira sessão):
   - Participantes: 4–6 (mín. 2 chefes de gabinete, 2 assessores; ideal incluir 1 pessoa que passou por transição recentemente).
   - Formato: sessão individual de ~45 min — cenário de tarefas guiadas (criar rotina, executar checklist do dia, registrar contato, atribuir tarefa, consultar guia de transição como "sucessor") + think-aloud.
   - Instrumentos: observação estruturada + questionário SUS + 3 perguntas abertas (utilidade percebida, clareza, contribuição para continuidade administrativa — alinhadas à questão de pesquisa).
   - Ética: termo de consentimento; nenhum dado real de processo/gabinete nas sessões (usar seed fictício).
6. Executar sessões; registrar achados por participante e consolidar por tema.
7. Aplicar ajustes críticos (timebox de 3 dias); demais achados → backlog v2.

### Etapa 6.3 — Análise e entrega (dez) — casada com o cronograma do TCC

8. Analisar resultados: SUS médio, taxa de conclusão das tarefas, temas qualitativos; confrontar com a questão de pesquisa e os objetivos.
9. Congelar código: revisão final de qualidade (checklist do CLAUDE.md), tag `v1.0.0-tcc`, README com instruções completas de execução (clone → docker compose → seed → app).
10. Redigir material técnico para o artigo: arquitetura final, screenshots, resultados da validação, limitações e trabalhos futuros (backlog v2).
11. Revisão textual e adequação ABNT do artigo (fora do escopo destes planos, mas no cronograma).

### Paralelização

- 6.1 e a preparação do protocolo de 6.2 (passo 5) podem ocorrer em paralelo.
- 6.3 (análise) começa assim que as primeiras sessões de 6.2 forem concluídas.

## Riscos da fase

| Risco | Mitigação |
|-------|-----------|
| Participantes cancelarem em novembro | Agenda feita na Fase 0 com lista de reservas; sessões remotas por vídeo como fallback |
| Feedback pedir mudanças grandes | Regra pré-definida: apenas ajustes críticos entram; o restante é documentado como trabalho futuro (valor acadêmico igual) |
| Dezembro apertado para análise + artigo | Registrar resultados de forma estruturada durante as sessões, não depois |

## Revisão e critérios de saída (encerramento do projeto)

- [ ] 100% dos casos de teste executados; zero defeitos bloqueantes ou altos em aberto.
- [ ] Mínimo de 4 sessões de validação realizadas com o perfil correto de participantes.
- [ ] Resultados consolidados respondem à questão de pesquisa do TCC.
- [ ] Ajustes críticos aplicados e re-testados; backlog v2 documentado.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` verdes; tag `v1.0.0-tcc` criada.
- [ ] README permite que uma pessoa externa rode o projeto do zero.
- [ ] Rastreabilidade completa: cada objetivo específico do TCC (1–6) tem evidência de cumprimento apontável nos entregáveis.
