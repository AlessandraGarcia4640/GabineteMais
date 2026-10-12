# Dashboard inicial — etapa 35

Após o login, a tela Hoje apresenta nome, data do gabinete, atalhos, até cinco tarefas próprias pendentes e até cinco rotinas previstas para o dia. As informações vêm da API real; não há dados demonstrativos fixos na interface.

As tarefas combinam abertas/em andamento e seguem prazo crescente, nulos ao final, prioridade decrescente e id. Atraso, prazo e prioridade são exibidos nas linhas. A prévia não informa um total global. Se houver outras pendências, o usuário é orientado a consultar a lista.

Rotinas de hoje incluem diárias sem data específica e atividades com data específica igual ao dia em America/Sao_Paulo. Atividades diárias com uma data futura não aparecem antes da data. Frequências semanais/mensais sem dia definido não são presumidas como agendadas para hoje.

Atalhos:

- Tarefas: consulta própria por status, com paginação de 20 registros e botão Carregar mais.
- Rotinas de hoje: consulta paginada do mesmo calendário usado pela prévia.
- Meu perfil: identidade, perfil e saída da conta.

As duas consultas longas usam FlashList. São telas de consulta de apoio ao dashboard; cadastro, edição e execução serão tratados nas etapas dos módulos. Campos extensos de orientação/descrição são resumidos nessa consulta inicial.

Cada seção trata carregamento, vazio e erro com nova tentativa. Puxar para atualizar ou tocar Atualizar renova os dados. A consulta também acompanha retorno ao primeiro plano e troca da data civil. Uma falha ao carregar mais não remove registros já exibidos.

## API e contratos

GET /routines aceita o novo parâmetro opcional scheduledFor=YYYY-MM-DD, validado no shared e aplicado no repository. Mantém autenticação/permissão activities:read, demais filtros e cursor. OpenAPI e parâmetros gerados foram atualizados. Payloads e o número de rotas não mudaram.

O cliente usa GET /tasks com assigneeId/status e GET /routines com scheduledFor. Respostas são validadas com os schemas shared; credenciais continuam privadas no gerenciador da etapa 34. Chaves de cache contêm usuário, filtros e data, sem tokens.

## Validação

Jest/RN Testing Library cobrem dados, filtros, atalhos, carregamento sem falso vazio, erros independentes, tentativa manual, troca de status e próxima página. O teste de navegação usa Expo Router real. Nos testes das listas, somente a virtualização nativa é substituída pelo FlatList de teste; não se mede desempenho nesse ambiente.

dashboard.integration.test.ts utiliza o cliente mobile contra HTTP/PostgreSQL reais, verificando datas, pesquisa combinada, arquivamento, escopo das pendências, ordenação, cursor e bloqueio após logout. Execute pnpm check e pnpm test:integration; o CI também exporta a versão web.

Revisão visual e execução em aparelho continuam necessárias para a validação final da interface. A geração de bundles não substitui essa conferência.
