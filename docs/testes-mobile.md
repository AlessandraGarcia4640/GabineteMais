# Testes dos fluxos mobile — etapa 42

`pnpm check` executa Jest/React Native Testing Library com tipos/lint. CI repete a suite mobile inteira após esse check para verificar estabilidade. Não se contam execuções repetidas como novos casos.

| Cobertura | Evidência |
| --- | --- |
| Login, falha e sessão | auth/login-screen, auth/session-manager, auth/api, auth/storage |
| Formulários e limites compartilhados | routines/contacts/checklists/tasks model e screens |
| Carga, vazio, erro, cursor e recuperação | dashboard/list-screens e screens de cada módulo |
| Permissões, tarefa encerrada, checklist incompleto | tasks/screens e models; integração PostgreSQL nos testes da API |
| Marcação otimista e rollback | checklists/screens e model |
| Navegação crítica | auth/navigation usa RootLayout/Expo Router real: sessão protegida/logout, tarefa→status→histórico; contato→cadastro→edição com rede falhando→arquivo |
| Acessibilidade básica | components/accessibility e lib/contrast |

HTTP é simulado apenas nos testes de componentes/navegação, com respostas validadas pelos consumidores reais. Integração com Express/PostgreSQL usa as suites separadas em apps/api/src/testing/mobile-*.integration.test.ts. FlashList é substituída por FlatList; módulos nativos do Expo são fronteiras simuladas. Nenhuma dessas simulações comprova desempenho, layout ou uso em aparelhos.

Temporizadores de listas são controlados nos testes que paginam/trocam filtros. Aguarda-se o estado visível, não apenas o início da requisição. Dados são fictícios; armazenamento seguro simulado é limpo entre jornadas. Validação com dispositivos/leitores de tela segue pendente.
