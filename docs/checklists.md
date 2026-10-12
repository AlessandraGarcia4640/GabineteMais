# Checklists — issue #29

| Método/rota | Operação |
|---|---|
| GET/POST /checklists/templates | Lista paginada/cadastro de modelos |
| GET/PATCH/DELETE /checklists/templates/:id | Consulta/edição/arquivamento |
| POST /checklists/templates/:id/runs | Inicia ou recupera execução do período |
| GET /checklists/runs | Histórico paginado com filtros |
| GET /checklists/runs/:id | Snapshot, itens, progresso e status |
| PATCH /checklists/runs/:id/items/:itemId | Marca/desmarca item |

Todos exigem autenticação. Modelos só são geridos por CHEFE; execução é marcada
pelo responsável ou chefia. Cadastro exige routineId/title e pode fornecer items;
sem items copia os passos da atividade. Início recebe date/assigneeId opcionais.
Marcação recebe somente isCompleted: autoria e horário vêm do servidor.

Listagens usam limit 20 padrão (máximo 100) e cursor de id. Modelos filtram rotina
e isArchived; execuções filtram templateId, routineId, assigneeId, status, from/to.
Manter filtros ao navegar. Dados de periodEnd são exclusivos; ver ADR-008.

Erros: FORBIDDEN (403), CHECKLIST_*_NOT_FOUND (404), CHECKLIST_EMPTY (400),
CHECKLIST_TEMPLATE_ARCHIVED/ROUTINE_ARCHIVED/CHECKLIST_ASSIGNEE_INACTIVE/
CHECKLIST_RUN_EXISTS (409). Marcação idempotente não troca autoria nem incrementa
contador. A antiga execução conserva os itens/instruções mesmo após editar modelo.

Seed cria um modelo fictício para a rotina de e-mail, sem sobrescrever edições.
Execuções são criadas ao iniciar; não há processo agendado. Modelos podem ser
arquivados sem perder execuções anteriores. A tela de checklist segue na fase mobile.
