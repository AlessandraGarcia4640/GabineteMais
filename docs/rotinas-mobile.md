# Rotinas no aplicativo — etapa 36

O catálogo permite buscar por título/descrição, escolher frequência e alternar Todas, Hoje e Arquivadas. A consulta é paginada em 20 registros; usa FlashList, atualização manual e estados de carregamento, vazio e erro. O atalho do dashboard abre o filtro Hoje; a opção Todas dá acesso ao catálogo ativo completo.

Todos os perfis ativos consultam os detalhes, orientações completas, passos ordenados, frequência, data específica, cargo padrão e indicação de essencial para transição. Somente CHEFE recebe ações de cadastro, edição e arquivamento. Links diretos para formulários também verificam o perfil; o cliente revalida essa condição antes da mutation e a API continua sendo a autorização definitiva.

O formulário usa React Hook Form e Zod com validação do contrato shared. Datas são editadas em DD/MM/AAAA e convertidas para o formato civil da API. Frequência PERSONALIZADA exige detalhes. Passos são campos separados: podem ser adicionados, removidos e movidos sem dividir textos que contêm quebras de linha. O limite é 100 passos, de até 500 caracteres cada. O formulário e a leitura dos passos usam FlashList.

Ao editar, uma cópia inicial serve de referência; somente diferenças são enviadas no PATCH. Isso preserva campos que a pessoa não alterou e evita transformar passos multiline em novos passos. Limpar data/cargo/detalhes opcionais envia null. Não há controle de versão para alterações simultâneas do mesmo campo; vale a semântica atual da API.

O envio desabilita controles e não usa repetição automática. Falhas preservam a entrada e mostram mensagem institucional. O botão Cancelar confirma descarte quando há alterações. Rascunhos não são persistidos entre sessões; navegação do sistema não oferece persistência automática de rascunho.

O arquivamento exige confirmação na tela e preserva registros vinculados. A rotina arquivada permanece consultável e não oferece edição. As consultas de catálogo, dashboard e detalhes são invalidadas após alterações. Se a API devolver FORBIDDEN por mudança de cargo, o cliente consulta o perfil atual; não depende de um perfil antigo do JWT.

Endpoints utilizados: GET/POST /routines e GET/PATCH/DELETE /routines/:id. Não há mudança de contrato, banco ou permissões da API nesta etapa. O transporte compartilha timeout, cancelamento, validação de resposta e sessão segura; códigos de negócio são mantidos sem exibir mensagens internas do servidor.

## Validação

Testes de componente verificam busca/filtros, detalhes, perfil de manutenção, validação, falha com entrada preservada, PATCH mínimo, reordenação multiline, descarte e confirmação de arquivamento. A navegação com Expo Router real continua coberta. A virtualização nativa é substituída nos testes de componente; desempenho não é aferido nesses testes.

mobile-routines.integration.test.ts exercita os mesmos conversores e cliente contra HTTP/PostgreSQL reais: criação personalizada, detalhes, campos preservados, limpeza de opcionais, busca, arquivamento e recusa após mudança oficial de cargo. Execute pnpm check e pnpm test:integration; o CI repete as integrações e exporta a versão web.

Revisão visual e execução em aparelho Android/iOS seguem pendentes para a validação final da interface.
