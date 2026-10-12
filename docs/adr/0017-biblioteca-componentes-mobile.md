# ADR 0017 — Biblioteca de componentes do aplicativo

Status: aceita.

Button e TextField já compartilhados são mantidos como controles base; Card, Choice, Checkbox, estados de feedback e Screen passam a compor a biblioteca em src/components. Há um ponto público de exportação e documentação junto ao código. As peças de apresentação genéricas não importam features, sessão, rede ou roteador. TaskCard/RoutineCard mantêm a apresentação de domínio, compostos sobre Card.

Componentes recebem estado e callbacks do chamador. Card interativo exige nome acessível e ação pelo tipo de propriedades. Button ocupado bloqueia novo comando; Choice/Checkbox comunicam seleção e bloqueio. TextField preserva atributos nativos e estilo adicional, mantendo indicação de erro e dica acessível. As permissões, validação Zod e regras de negócio continuam nos fluxos/servidor.

Screen centraliza área segura/fundo/teclado, sem impor rolagem nem padding. Listas virtuais permanecem diretamente no contêiner. AuthScreen é composição para acesso/perfil, com rolagem e todas as bordas seguras. A área segura padrão dos fluxos com cabeçalho é inferior, preservando o arranjo existente.

Superfície, borda, raio e apresentação de cards deixam de ser repetidos por módulo. Estados genéricos e Choice saem de features, sem aliases de compatibilidade. Mensagens genéricas passam ao namespace strings.feedback, com consumidores e testes atualizados. Não há mudanças de contratos/API, migrations ou dependências.

Testes dos componentes cobrem comportamento público e acessibilidade; suites dos fluxos preservam as verificações de regras/permissões/navegação. Exportações verificam bundling. Padronização de espaçamentos/raios ainda exige revisão visual em Android/iOS e comparação com Figma; testes de componente não comprovam fidelidade ou desempenho nativo.
