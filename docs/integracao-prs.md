# Consolidação do núcleo RF00–RF04

A branch de integração preserva os commits da cadeia #72–#82, #84, #86–#96, criada sobre a main 4fb4412. A implementação alternativa #85 não é incluída: usa contratos de autenticação diferentes e não pertence à cadeia validada.

Revisão técnica do conjunto: contratos Zod/OpenAPI, migrations incrementais, autenticação/refresh/logout, RBAC atual na API, revalidação de ator/sessão em mutações, proteção da última chefia, snapshots de checklist, transições de tarefas, armazenamento de refresh nativo e isolamento dos bancos de teste. A revisão foi feita sobre o estado final, que inclui correções posteriores aos primeiros PRs.

Critério de integração: CI do PR contra main aprovado com tipos/lint, suites mobile e PostgreSQL repetidas, migrations, seed idempotente, backup/restauração isolados, build e exportação web. Merge mantém os commits originais; PRs individuais podem ser reconhecidos como integrados pelo GitHub. Não misturar #85 nem descartar documentação existente da main.

Isso incorpora o núcleo implementado, não certifica produção. RF05/RF06 serão entregues em PRs próprios, com schemas, migrations, API, UI e testes. Build instalável e validação física/usuários permanecem próximos passos.
