# ADR 0020 — Guia vivo e cópias de transição

Status: aceito.

RF06 agrega visão geral, rotinas essenciais ativas, orientações essenciais ativas, contatos-chave ativos, tarefas abertas/em andamento e anotações. Visão geral e anotações ficam em configuração única; os demais dados continuam nos módulos de origem. O endpoint `/transition-guide` seleciona uma seção paginada, mantendo os dois textos de curadoria na resposta. A tela oferece as seis seções na ordem do plano.

A chefia edita os textos com revisão esperada e gera uma cópia completa. Uma transação Repeatable Read captura todas as fontes, autoria e responsável das tarefas. A geração incrementa a revisão, serializa versões e rejeita concorrência/desatualização com 409. PostgreSQL rejeita UPDATE/DELETE das cópias por trigger; consulta antiga usa apenas JSON preservado.

Cada seção da cópia suporta até 100 itens no protótipo. Mais itens causam erro explícito, sem criar cópia parcial ou truncada. O guia vivo permanece paginado. Rever este limite antes de ampliar o piloto.

Exportação PDF/Markdown é Could no plano da fase. Foi adiada para priorizar os módulos funcionais e o APK de validação; não impede a reabertura da cópia no aplicativo. Substituições de cargo com ampliação de permissões não foram adicionadas: transição documental segue o escopo das seis seções.

Validação inclui cliente mobile real/PostgreSQL, preservação após edições e arquivamentos, concorrência, revisão, limite, paginação, leitura por assessor, proteção do banco e mudança de perfil durante a sessão.
