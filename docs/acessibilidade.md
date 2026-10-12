# Acessibilidade básica — etapa 41

Rótulos e papéis de botão, rádio e checkbox anunciam ação/seleção/bloqueio. Sim/não nos formulários de rotina/contato recebem contexto da pergunta. Erros dos campos são alertas e compõem a dica acessível. Navegação por teclado tem borda de foco nos controles compartilhados. O modal de seleção isola o conteúdo e oculta o formulário/detalhe subjacente para leitores de tela, sem bloquear seu retorno ao fechar.

Alvos interativos usam mínimo de 48 unidades lógicas, com botão/campo de 52. Textos dos controles permitem escalonamento, sem altura fixa nem limite de ampliação. Conteúdo pode quebrar linhas; formulários e detalhes são roláveis. Mostrar/ocultar senha usa o mesmo botão acessível e fica indisponível durante login.

Contraste calculado segundo luminância sRGB: texto principal/superfície 13,11:1; texto secundário/superfície 5,78:1; primário/branco 6,11:1; branco/primário pressionado 8,44:1; borda/superfície 3,94:1. Testes exigem 4,5:1 para texto e 3:1 para bordas em todas as superfícies usadas. Estados pressionados mudam fundo, preservando contraste; somente controles inativos usam redução de opacidade.

Referências primárias: [WCAG 2.2, contraste textual](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [React Native, acessibilidade](https://reactnative.dev/docs/accessibility). Os limiares são verificação automatizada de cores; isto não é certificação WCAG completa.

## Evidências e pendências

Testes de controles, contraste e regressões dos fluxos; bundles web/Android/iOS. Ainda é necessário validar TalkBack/VoiceOver em aparelhos, foco/restauração do modal, teclado externo, ampliação a 200% e ausência de recortes em telas pequenas. Não há evidência de execução dessas verificações nativas neste ambiente; os testes de árvore React e props não comprovam geometria real ou leitura por tecnologias assistivas.
