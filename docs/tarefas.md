# API de tarefas — issue 31

Endpoints autenticados: GET/POST /tasks; GET/PATCH/DELETE /tasks/:id; PATCH /tasks/:id/assignee; PATCH /tasks/:id/status; GET /tasks/:id/history. Contratos shared e OpenAPI; exemplo fictício em openapi/examples/task.json.

Filtros: status, priority, assigneeId, routineId, q, dueFrom, dueTo, overdue. Limite padrão 20, máximo 100; siga nextCursor. Prazo de hoje não está atrasado; tarefas encerradas nunca estão atrasadas.

Erros: TASK_NOT_FOUND (404), FORBIDDEN (403), TASK_CLOSED, TASK_INVALID_TRANSITION, TASK_ASSIGNEE_INACTIVE, TASK_CHECKLIST_MISMATCH, TASK_CHECKLIST_INCOMPLETE, CHECKLIST_TASK_COMPLETED (409), INVALID_CURSOR (400).

Seed prepara duas tarefas fictícias, preservando edições. Integração cria banco isolado e aplica todas as migrations quando TEST_DATABASE_URL está definido. CI utiliza PostgreSQL 16.

Mobile tem reexportação dos schemas. Telas e testes funcionais mobile pertencem à Fase 4 e não são entregues nesta issue de backend.
