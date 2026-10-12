# ADR 0016 — Tarefas no aplicativo

Status: aceita.

As telas usam os contratos existentes de tarefas e eventos, sem alterar API/OpenAPI ou migrations. Todos os perfis ativos podem criar tarefas próprias; no cadastro, somente chefia escolhe outro responsável. Criador ou chefia edita, reatribui e cancela; responsável ou chefia inicia/conclui. Tarefas encerradas permanecem consultáveis. Esses controles refletem a ADR 0010; a autorização definitiva e as transições continuam no service da API, com atualização de perfil após 403.

Formulários validam pelo createTaskSchema, adaptando prazo civil DD/MM/AAAA e comparando os campos editáveis com a referência inicial para PATCH mínimo. No cadastro, orientações vazias são omitidas para permitir herança da rotina; na edição, vazio é limpeza explícita. Responsável e vínculos não são alterados pelo PATCH dos textos: reatribuição é comando próprio e vínculos são definidos apenas na criação.

Seletores paginados em modal usam nomes/títulos, sem entrada de identificadores técnicos. Pessoas são filtradas por atividade, rotinas/contatos por não arquivamento; execuções por responsável e rotina opcional. Trocar responsável/rotina limpa o checklist selecionado. Selecionar execução define também sua rotina. O servidor valida novamente compatibilidade, atividade e arquivamento. Tarefa com checklist não oferece reatribuição incompatível; seu responsável deve permanecer igual ao da execução.

Mutações não são otimistas nem repetidas automaticamente. Detalhe impede comandos concorrentes por referência e controles ocupados. Resposta confirma o estado e atualiza detalhe, catálogo, painel e histórico; falha atualiza o detalhe para refletir conflitos. Resposta após logout não restaura cache nem navega. Cancelamento exige confirmação no aplicativo e preserva registros. Os conflitos de checklist incompleto, tarefa encerrada e transição inválida possuem mensagens próprias.

Listas/seletores/histórico usam FlashList e paginação por cursor. Histórico exibe eventos e autoria com nomes; ele não constitui versionamento dos textos anteriores. Prazo e atraso vêm da API, enquanto a data do gabinete no cache força nova consulta na virada de dia/retorno ao aplicativo.

Testes de componentes substituem somente a fronteira FlashList por FlatList. O cliente e adaptadores são testados contra API real/PostgreSQL, incluindo conclusão vinculada a checklist e preservação de vínculos/histórico. Bundles verificam compilação; performance, interação em aparelhos e fidelidade ao Figma permanecem validações manuais separadas.
