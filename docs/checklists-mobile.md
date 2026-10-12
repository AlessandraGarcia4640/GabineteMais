# Checklists no aplicativo — etapa 37

## Fluxo implementado

- Hoje → Checklists: modelos ativos ou arquivados, paginação e acesso ao histórico.
- Rotinas → detalhe → Modelos de checklist: catálogo filtrado pela rotina.
- Chefia: detalhe da rotina → Novo checklist; passos copiados como itens editáveis, com inclusão, remoção e reordenação. Formulários validam título, itens e limites compartilhados. Cancelar alterações pede confirmação de descarte; falha mantém os campos preenchidos.
- Detalhe do modelo: itens, versão, rotina vinculada, edição e arquivamento pela chefia com confirmação. O histórico permanece acessível após arquivar.
- Iniciar ou abrir execução: data de referência validada, responsável igual ao usuário conectado, período definido pela frequência no servidor; o mesmo período reutiliza a execução existente. A criação é explícita.
- Histórico: minhas/todas as execuções, filtro opcional pelo modelo, paginação por cursor; abre snapshots preservados mesmo após edição/arquivo do modelo.
- Execução: orientações e itens originais, status, contador, autoria e horário. Responsável/chefia podem marcar e desmarcar, com atualização otimista, rollback e mensagem de conflito para tarefa concluída. Outros integrantes consultam em modo de leitura.

## Verificação automatizada

`pnpm check` verifica tipos, lint sem warnings e suites rápidas. Testes de componentes cobrem filtros, paginação, estados, formulário, início, confirmação de arquivo, consulta de terceiros, marcar/desmarcar, rollback e resposta tardia após logout. O teste `mobile-checklists.integration.test.ts` usa o mesmo cliente e adaptadores dos formulários contra API real e PostgreSQL, incluindo idempotência por período e preservação de snapshots. A suite de integração é executada duas vezes no CI, com bancos isolados.

`pnpm build` verifica API/shared; `pnpm --filter @gabinete-plus/mobile export:web` verifica as rotas e o bundle web. A exportação Expo para Android/iOS valida os bundles, sem equivaler à execução em aparelhos.

## Roteiro de validação manual pendente

1. Com API/PostgreSQL e dados fictícios, entrar como chefia, criar checklist a partir de uma rotina, editar e reordenar itens.
2. Entrar como assessor, iniciar para uma data, concluir itens e verificar progresso. Abrir novamente o mesmo período e conferir a mesma execução.
3. Consultar como outro integrante: marcação deve estar desabilitada. Como chefia, consultar e marcar a execução de outra pessoa.
4. Editar o modelo: execução antiga mantém conteúdo original. Arquivar: histórico continua consultável e execução anterior pode ser concluída; novas execuções ficam indisponíveis.
5. Simular falha de rede: marcação deve reverter; repetir após restabelecer a conexão. Conferir conflito ao desmarcar checklist vinculado a tarefa concluída.
6. Conferir teclado, safe area, leitura por acessibilidade, rolagem e layout em Android/iOS; comparar com o Figma. Essas verificações ainda não foram executadas neste ambiente.

Sem persistência offline de marcações ou rascunhos. Atribuição de execução a outra pessoa e filtros adicionais de histórico permanecem disponíveis na API, sem formulário próprio nesta etapa. Alterações concorrentes de modelos não têm controle de versão no contrato atual.
