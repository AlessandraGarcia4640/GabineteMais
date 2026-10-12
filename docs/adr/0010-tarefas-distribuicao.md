# ADR 0010 — Tarefas e distribuição

Status: aceita.

Todos os perfis ativos consultam e criam tarefas próprias; CHEFE cria para terceiros. Criador ou CHEFE edita, reatribui e cancela. Responsável ou CHEFE inicia e conclui. DELETE cancela e preserva vínculos.

Sequência: ABERTA → EM_ANDAMENTO → CONCLUIDA; CANCELADA somente dos estados não concluídos. Repetições do mesmo status ou responsável são idempotentes. Encerradas não reabrem. Histórico registra autoria, estados e responsáveis anteriores/novos e nomes dos campos editados; não guarda versões anteriores de textos.

Vínculos opcionais com atividade, execução de checklist e contato são definidos na criação. Instruções omitidas copiam a atividade. Checklist deve corresponder à atividade e responsável; reatribuição incompatível é recusada. Conclusão exige checklist concluído, que depois não pode ser reaberto.

Mutações e eventos são atômicos. Bloqueios de chefias, ator, tarefa e vínculos serializam alterações concorrentes com usuários/checklists. Revalidam-se sessão e perfil dentro da transação. O bloqueio global de chefias reduz capacidade concorrente e deverá ser revisto para escala maior.

Prazo é data civil; atraso considera America/Sao_Paulo. Cursor opaco composto por prazo, prioridade e id. Ordem: prazo ascendente, nulos ao final, prioridade descendente, id ascendente. Alterações de prazo/prioridade podem mover itens entre páginas; não se promete snapshot da listagem.
