# Tarefas no aplicativo — etapa 39

## Fluxo implementado

- Hoje → Tarefas: consulta paginada de minhas/todas as tarefas, busca textual, status, prioridade e atraso. Pendências do painel abrem o detalhe diretamente.
- Todos os perfis ativos podem cadastrar tarefa própria. Chefia também seleciona outro responsável ativo por nome. Título, descrição, orientações, prioridade e prazo civil são validados com o contrato compartilhado.
- Vínculos opcionais no cadastro: rotina ativa, contato ativo e execução de checklist compatível com responsável/rotina. Seletores paginam com estados de carga, vazio e erro. Trocar responsável/rotina remove seleção anterior de checklist; escolher execução preenche sua rotina. Sem digitação de IDs.
- Orientações omitidas no cadastro copiam a rotina. Na edição, limpar orientações ou prazo é explícito; demais campos/vínculos são preservados por PATCH mínimo. Dados não salvos permanecem após falha; cancelamento pelo formulário exige confirmação de descarte.
- Detalhe apresenta responsável/criador por nome, prazo/atraso, prioridade, orientações e links para rotina, contato e checklist. Criador/chefia editam, reatribuem e cancelam; responsável/chefia iniciam e concluem.
- ABERTA → EM_ANDAMENTO → CONCLUIDA. Cancelamento exige confirmação e é permitido nos estados não encerrados. Encerradas não oferecem manutenção nem reabertura. Concluir exige checklist vinculado completo; conflito é explicado e o vínculo permite acessar a execução.
- Reatribuição seleciona pessoa ativa e exige confirmação. Tarefas com checklist mantêm o mesmo responsável da execução; reatribuição incompatível permanece bloqueada.
- Histórico paginado exibe criação, edição, mudanças de responsável/status, autoria e horário. Não guarda versões anteriores dos textos. Falhas recuperáveis não eliminam páginas anteriores.

## Verificação automatizada

`pnpm check` cobre tipos, lint e suites rápidas. Testes verificam matriz de controles, validação, herança de orientações, PATCH mínimo, seletores, filtros, paginação, iniciar/concluir/cancelar, bloqueio por checklist, reatribuição e resposta tardia após logout. Navegação e painel incluem as novas rotas.

`mobile-tasks.integration.test.ts` usa cliente/adaptadores mobile contra API/PostgreSQL: seleção de recursos, criação com vínculos e herança, prazo em atraso, restrições por autoria/responsável, edição mínima, incompatibilidade de checklist, sequência de status, bloqueio da conclusão pendente, checklist fechado após concluir tarefa, reatribuição/cancelamento e histórico persistido. CI repete as integrações em bancos isolados, além de migrations, seed idempotente, build e exportação web.

## Roteiro manual pendente

1. Chefia: cadastrar tarefa para assessor, com rotina, contato e checklist compatível; conferir orientações herdadas e todos os links.
2. Assessor: abrir pendência no painel, iniciar tarefa, tentar concluir com checklist incompleto, concluir checklist e finalizar tarefa. Conferir atualização no painel/lista e bloqueio da reabertura.
3. Criar tarefa própria sem checklist, editar dados, reatribuir a integrante ativo e conferir os controles distintos de criador/responsável.
4. Cancelar tarefa não concluída com confirmação; consultar tarefa/eventos preservados. Tarefas concluídas/canceladas não podem ser editadas ou reabertas.
5. Conferir filtros, rolagem/paginação dos seletores, estados de rede e manutenção do rascunho após falha. Testar alteração de perfil durante sessão e retorno ao aplicativo após virar o dia.
6. Validar teclado, modais, safe area e acessibilidade em Android/iOS e comparar com Figma. Bundles compilados não equivalem a essa validação em aparelhos, ainda pendente neste ambiente.

Sem fila offline de comandos, persistência de rascunhos ou controle de versão dos campos em edição concorrente. O vínculo usa uma execução de checklist já criada; iniciar uma execução para outra pessoa continua disponível pela API de checklists, sem formulário próprio nesta etapa. Filtros por intervalo de prazo, pessoa específica e rotina permanecem disponíveis na API, além dos filtros presentes nesta UI.
