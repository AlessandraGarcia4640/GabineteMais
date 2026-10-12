# ADR 0014 — Execução e manutenção de checklists no mobile

Status: aceita.

O aplicativo consome os contratos existentes de templates e runs; não há alteração de API, OpenAPI ou migrations. A criação parte do detalhe de uma rotina, sem pedir identificadores técnicos. O formulário adapta itens para useFieldArray, preserva conteúdo multiline e ordem, valida com createChecklistSchema e envia somente diferenças na edição. Os passos da rotina são o valor inicial editável.

Abrir um modelo não cria execução. O botão explícito recebe uma data civil DD/MM/AAAA, validada por startChecklistSchema, e usa a criação idempotente por período da API. Nesta etapa o início usa o próprio usuário como responsável; a atribuição a outra pessoa continua disponível na API e será integrada ao fluxo de distribuição de tarefas. O histórico permite consultar minhas execuções ou todas, com filtro por modelo e paginação por cursor.

As execuções exibem exclusivamente snapshots do servidor. Alterar ou arquivar modelos não modifica os runs anteriores. A pessoa responsável e a chefia podem marcar itens; a API revalida sessão e permissão. Erros 403 atualizam o perfil atual. Tarefas concluídas podem impedir reabertura; o conflito recebe mensagem própria.

A marcação otimista cancela a consulta do run, guarda o valor anterior e altera itens, contador, progresso e status. A resposta do servidor é definitiva. Erros restauram o valor anterior; ao finalizar, run e histórico são invalidados. Um bloqueio imediato por referência impede duplo envio antes do próximo render, e os controles permanecem indisponíveis durante mutation/refetch. Comandos não têm retry automático. Respostas posteriores ao logout não repovoam o cache. Autoria é exibida por nome, com consulta de usuário pelo contrato existente e fallback institucional.

Listas e itens usam FlashList; testes de componentes substituem apenas essa fronteira nativa por FlatList. Esses testes não medem virtualização, performance ou fidelidade visual em aparelhos. Exportação web/nativa verifica bundling, e integração do cliente HTTP com API/PostgreSQL verifica o fluxo persistido. Validação em Android/iOS e comparação com Figma permanecem verificações manuais separadas.
