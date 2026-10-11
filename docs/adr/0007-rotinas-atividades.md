# ADR-007 — Rotinas/atividades e arquivamento

Status: implementação da issue #28.

Routine é a definição de uma atividade; tarefa/checklist são ocorrências, que
serão implementadas nas próximas etapas. Não gerar tarefas automaticamente nesta entrega.
API usa /routines e UI poderá usar “Atividades”, conforme catálogo validado.

Frequências: diária, semanal, quinzenal, mensal, eventual, personalizada e a definir.
Personalizada exige frequencyDetails; não representa expressão cron executável.
Categoria é texto com limite, permitindo as categorias do catálogo e outras futuras.
defaultPosition vincula responsabilidade ao cargo, não a pessoa permanente.
specificDate é DATE/AAAA-MM-DD, sem horário ou conversão de fuso. Atribuição concreta
de responsável e substituições ocorrerão nos módulos de tarefas e continuidade.

Todos os perfis ativos consultam; apenas CHEFE cria/edita/arquiva. Service verifica
activities:manage e revalida ator/sessão na transação. Autoria vem do servidor.
Listagem por cursor de id, ordem crescente, limite 20 padrão e máximo 100, com
filtros e busca. Atividades arquivadas ficam fora da listagem padrão.

DELETE arquiva sempre, sem exclusão física. Essa política preserva desde já as
referências de futuros checklists; edição de arquivada retorna 409. Arquivar duas
vezes é idempotente. Não há restauração nesta entrega. Cadastro inclui descrição,
instruções, passos ordenados e marcação de essencial para transição.

Seed idempotente cria três exemplos fictícios sem sobrescrever edição/arquivamento
existente. Data do exemplo pontual é apenas demonstração, não agendamento real.
