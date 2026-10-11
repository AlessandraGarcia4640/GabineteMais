# Rotinas e atividades — issue #28

| Método/rota | Acesso | Resultado |
|---|---|---|
| GET /routines | Todos os perfis ativos | Página de atividades |
| GET /routines/:id | Todos | Detalhe, incluindo arquivadas |
| POST /routines | CHEFE | Cadastro; 201 e Location |
| PATCH /routines/:id | CHEFE | Edição validada sobre os dados atuais |
| DELETE /routines/:id | CHEFE | Arquivamento; 204 |

Cadastro exige title, category e frequency. description, instructions, steps,
frequencyDetails, specificDate, defaultPosition e essentialForTransition são
opcionais. Frequência PERSONALIZADA exige descrição. Data específica é AAAA-MM-DD.
Não enviar autoria ou isArchived: vêm do servidor. PATCH vazio é inválido.

Listagem: limit (20 padrão, máximo 100), cursor, frequency, category,
defaultPosition, q (título/descrição) e isArchived (false padrão). Manter filtros
entre páginas e usar nextCursor retornado. Arquivada pode ser consultada, mas
não editada (409 ROUTINE_ARCHIVED). Alvo ausente retorna 404 ROUTINE_NOT_FOUND.

Seed prepara três atividades fictícias, preservando alterações anteriores.
Modelo e migration incluem auditoria por usuários, passos ordenados e data DATE.
Checklists, execução periódica, calendário visual e tela mobile ainda não estão
implementados. Veja ADR-007 e catálogo de atividades.
