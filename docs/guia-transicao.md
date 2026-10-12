# Guia de transição — RF06

Abra **Guia de transição** na tela inicial. Use as seis opções: visão geral, rotinas essenciais, orientações essenciais, contatos-chave, tarefas em aberto e anotações. Todos os perfis ativos podem ler o guia e as cópias preservadas.

A chefia abre **Preparar transição**, marca os itens essenciais nos cadastros de rotinas e orientações e os contatos-chave em contatos. Tarefas abertas ou em andamento entram automaticamente. Salve a visão geral e as anotações antes de gerar uma cópia com título.

Uma cópia contém o conteúdo completo no momento da geração, incluindo autoria e responsável pelas tarefas. Edições, arquivamentos e conclusão de tarefas posteriores não alteram a cópia antiga. Abra **Cópias preservadas** para consultá-la por seção.

Se outra pessoa alterar a curadoria ou gerar uma cópia durante a preparação, reabra o guia antes de continuar. O rascunho permanece na tela após o erro. Cópias com mais de 100 itens em uma seção são recusadas explicitamente; nenhuma informação é truncada silenciosamente.

API: GET/PATCH `/transition-guide`, GET/POST `/transition-guide/snapshots`, GET `/transition-guide/snapshots/:id`. Consulte o contrato OpenAPI para filtros, limites, revisões e erros. O seed fornece conteúdo fictício nas fontes e nos textos do guia. Exportação de arquivo e autorização de substituição funcional permanecem fora desta entrega.

A validação com pessoa que nunca usou o app e em dispositivo físico ainda precisa ser executada. Os testes automatizados não substituem esses critérios de saída da fase.
