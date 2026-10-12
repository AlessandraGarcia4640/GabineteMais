# ADR 0015 — Consulta e manutenção de contatos no mobile

Status: aceita.

As telas consomem os endpoints e schemas de contatos existentes. Não há alterações de contrato, OpenAPI, migrations ou dependências. Dados remotos passam por TanStack Query e SessionManager, com paginação por cursor e cache por usuário/filtros. A consulta é disponível a todos os perfis ativos; a manutenção é oferecida à chefia, conferida novamente no momento da chamada e definitivamente pelo servidor. FORBIDDEN atualiza o perfil atual.

Telefones e etiquetas usam duas coleções useFieldArray, reunidas em linhas tipadas da FlashList. Cada valor permanece separado; observações multiline são preservadas. O formulário adapta e-mail vazio para null e delega limites e normalização de etiquetas/e-mail a createContactSchema. Na edição, valores normalizados são comparados com a referência inicial para enviar PATCH somente de campos alterados, inclusive limpeza explícita de opcionais. Refetch não sobrescreve rascunhos.

A busca consulta nome, instituição e etiquetas, conforme searchText da API. Instituição exata, etiqueta, contatos-chave e arquivamento usam filtros próprios no servidor, sem filtrar apenas uma página localmente. A aplicação dos campos textuais é explícita. Limpar filtros retorna ao catálogo ativo. Todas as listas tratam carga inicial, vazio, falha, atualização e erro de próxima página com preservação dos registros já carregados.

Arquivamento tem confirmação no aplicativo e mantém o soft delete da API. Cancelar alterações pelo formulário pede descarte explícito. Mutations não têm repetição automática nem otimismo para CRUD; sucesso atualiza detalhe e invalida catálogo. Respostas tardias após logout não restauram cache nem navegam. Rascunhos não são persistidos e alterações concorrentes de um mesmo campo não têm controle de versão no contrato atual.

Testes de componentes substituem FlashList por FlatList, sem validar desempenho nativo. O cliente e adaptadores do formulário são testados também contra API real/PostgreSQL. Bundles web/Android/iOS verificam compilação; fidelidade visual e interação em aparelhos permanecem verificações manuais.
