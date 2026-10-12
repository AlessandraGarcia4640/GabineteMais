# ADR-008 — Checklists, períodos e snapshots

Status: implementação da issue #29. Registra a decisão de geração lazy prevista
no plano da Fase 3; a numeração ADR-006 já foi usada na gestão de usuários.

Modelos pertencem a atividades e contêm título/itens ordenados, versão e autoria.
Chefias gerenciam modelos. Omitir itens no cadastro copia os passos atuais da
atividade; ao menos um item é obrigatório. Edição incrementa versão, sem alterar
execuções existentes. Arquivamento preserva modelo e referências.

POST /checklists/templates/:id/runs gera execução ao iniciar. Não há cron nem
criação por GET. Data omitida usa specificDate da atividade ou o dia do gabinete
em America/Sao_Paulo. Períodos são datas, sem fuso: diário usa o dia; semanal começa
segunda-feira; mensal começa no dia 1; quinzenal usa dias 1–15 e 16–fim do mês.
Eventual, personalizada e a definir usam o dia informado, sem interpretar texto
de frequência. periodEnd é exclusivo. Frequência alterada vale para novas execuções.

Uma chave por template/período e bloqueio transacional evitam duplicatas, inclusive
concorrentes. Repetir início retorna a execução existente com 200 (nova usa 201).
Responsável não muda por repetição; conflito de responsável é negado. Membros
iniciam para si; chefia pode indicar outro usuário ativo. Cargo padrão orienta a
distribuição, sem restringir a escolha de outro membro pela chefia.

Execução copia título, versão, frequência, instruções e texto/ordem dos itens.
Snapshot é imutável; apenas conclusão, autoria e horário dos itens são atualizáveis.
Responsável ou CHEFE marca/desmarca. Repetir estado é idempotente e preserva a
autoria original. Desmarcar limpa autoria/horário atuais. Não há log de cada alternância.
Contador/status são atualizados atomicamente com item: por fazer, em andamento,
concluída; percentual é calculado. Desmarcar item reabre checklist.

Arquivar atividade/modelo impede novas execuções, mas pendências antigas podem
ser concluídas e consultadas. Usuários desativados não atuam; chefia pode concluir
pendências deles. Todas as regras são verificadas no service com ator/sessão atuais.
Locks seguem chefias, ator, atividade, modelo e execução para evitar conflitos.

Há até 100 itens por recurso e listagens paginadas (máximo 100). Histórico aceita
intervalo inclusivo do usuário, retornando períodos que se sobrepõem às datas.
Não há reatribuição, exclusão física de execuções ou tela mobile nesta entrega.
