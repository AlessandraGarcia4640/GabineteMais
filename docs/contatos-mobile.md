# Contatos no aplicativo — etapa 38

## Fluxo implementado

- Hoje → Contatos: catálogo paginado com busca por nome, instituição ou etiqueta; filtros por instituição exata, etiqueta, contatos-chave e ativos/arquivados. Limpar filtros retorna à consulta de ativos.
- Detalhe: nome, órgão/instituição, cargo/função, telefones, e-mail, etiquetas, observações e indicação de contato-chave para transição. Informações opcionais ausentes recebem indicação clara.
- Chefia: Novo contato e Editar contato; inclusão/remoção de telefones e etiquetas, observações multiline e validação compartilhada com a API. E-mail vazio representa ausência; etiquetas e e-mail são normalizados pelo contrato. Edição envia apenas alterações e permite limpar opcionais.
- Arquivar contato: confirmação explícita, preservação dos vínculos existentes e consulta posterior pelo filtro de arquivados. Contatos arquivados não oferecem edição.
- Assessoria/apoio: consulta; links diretos não habilitam manutenção. API revalida as permissões atuais e recusa comandos indevidos.
- Falhas preservam campos preenchidos e registros de páginas anteriores, permitindo nova tentativa. Cancelar campos alterados pelo formulário exige confirmação de descarte. Respostas de criação posteriores ao logout não navegam nem repovoam cache.

## Validação automatizada

`pnpm check` verifica tipos, lint e suites rápidas. Testes de formulário/adaptadores cobrem obrigatórios, canais inválidos, limites, normalização, multiline e PATCH mínimo. Testes de componentes cobrem paginação, filtros, vazio/erro, leitura, perfil, cadastro com recuperação de falha, edição, confirmação de arquivo e logout durante envio.

`mobile-contacts.integration.test.ts` usa o mesmo cliente e adaptadores do formulário contra API/PostgreSQL: cadastro, consulta por filtros, atualização mínima, limpeza de opcionais, arquivamento, perda de perfil de chefia e encerramento de sessão. O CI executa a suite com banco duas vezes em bancos isolados, além de migrations, seed idempotente, build e exportação web.

## Validação manual pendente

1. Entrar como chefia usando dados fictícios, cadastrar contato com vários telefones/etiquetas e indicação de contato-chave; conferir detalhes e filtros.
2. Editar observações multiline, remover canais e limpar opcionais; salvar e conferir o conteúdo persistido.
3. Entrar como assessor/apoio e confirmar leitura sem controles de manutenção.
4. Arquivar como chefia: registro sai dos ativos, permanece nos arquivados e mantém dados/vínculos.
5. Simular falha de rede durante envio e paginação; conferir preservação dos campos e registros, com recuperação após nova tentativa.
6. Validar teclado, safe area, rolagem e acessibilidade em Android/iOS; comparar as telas com Figma. A compilação dos bundles não substitui essas verificações, ainda não executadas neste ambiente.

Sem persistência offline de rascunhos ou controle de versão para edição concorrente. As telas exibem os canais de contato; não enviam mensagens nem iniciam ligações.
