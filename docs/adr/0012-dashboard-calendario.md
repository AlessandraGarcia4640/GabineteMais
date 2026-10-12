# ADR 0012 — Dashboard e calendário explícito

Status: aceita.

O dashboard consome os endpoints existentes de tarefas e rotinas pela sessão autenticada, com TanStack Query. Mostra até cinco pendências atribuídas ao usuário e cinco rotinas previstas para a data civil de America/Sao_Paulo. Não apresenta o tamanho dessas prévias como total do gabinete.

Pendências combinam ABERTA e EM_ANDAMENTO, ordenadas por prazo crescente, sem prazo ao final, prioridade decrescente e id. Buscar cinco registros de cada status é suficiente para formar a prévia de cinco; consultas com mais dados retornam nextCursor e têm acesso à lista paginada. Perfis de chefia também veem suas próprias pendências nessa prévia.

O filtro opcional scheduledFor de GET /routines seleciona DIARIA sem specificDate ou registros cuja specificDate corresponde ao dia informado. Uma data específica prevalece sobre a frequência genérica. Não há regra de dia da semana/mês no modelo atual; portanto, SEMANAL/MENSAL/QUINZENAL sem data específica não recebem calendário presumido. O filtro combina com busca e paginação e preserva o padrão de exclusão de arquivadas.

As seções são independentes: falha em tarefas não oculta rotinas disponíveis e vice-versa. Carregamento não é interpretado como vazio. Atualização manual e retorno ao primeiro plano renovam as consultas; mudança do dia atualiza as chaves de cache.

Atalhos abrem consultas paginadas de tarefas por status, rotinas do dia e perfil. As listas longas usam FlashList e preservam registros já carregados em falha de próxima página. Cadastro, edição e execução de módulos ficam para suas etapas; não há novo endpoint agregador, total global ou geração automática de checklists nesta entrega.
