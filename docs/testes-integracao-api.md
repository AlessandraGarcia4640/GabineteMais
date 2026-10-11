# Testes de integração da API — etapa 33

A suíte testa as rotas HTTP reais, os serviços, os repositories e o PostgreSQL. Dados, nomes, e-mails e senhas são fictícios. Não simula o banco nem comprova os fluxos da interface mobile.

## Executar

Instale as dependências, gere o cliente Prisma e prepare um PostgreSQL de teste com permissão para criar bancos. Configure também `DATABASE_URL` e `JWT_ACCESS_SECRET`, exigidos pela API. A conexão de administração é informada por `TEST_DATABASE_URL`:

```powershell
$env:NODE_ENV = 'test'
$env:TEST_DATABASE_URL = 'postgresql://usuario_de_teste:senha_de_teste@localhost:5432/gabinete_test'
pnpm test:integration
```

O comando compila shared, seleciona somente `*.integration.test.ts` e falha antes de iniciar os testes se `TEST_DATABASE_URL` estiver ausente/inválida ou `NODE_ENV=production`. A conexão deve apontar para uma instância dedicada a testes, pois os casos precisam da permissão CREATEDB.

`pnpm check` continua verificando tipos, lint e testes rápidos; sem `TEST_DATABASE_URL`, marca as integrações como ignoradas. Isso não constitui validação de banco real. No CI, há uma etapa separada e obrigatória `pnpm test:integration`, com PostgreSQL 16; sua falha reprova o job. O CI repete a suíte para conferir que o isolamento e a limpeza permitem uma nova execução.

## Isolamento e estabilidade

Os oito testes anteriores mantêm seus bancos isolados por UUID e seus cenários por módulo. A nova suíte utiliza `database.test-helper.ts`: cria um banco exclusivo, aplica automaticamente todas as migrations versionadas em ordem e verifica a identidade do banco antes de reiniciar os dados. Nunca trunca ou exclui o banco informado na URL de administração.

Cada um dos 13 novos casos reinicia dados e cria uma nova aplicação, evitando dependência da ordem e contaminação dos limitadores de autenticação. Ao encerrar, desconecta Prisma e o cliente SQL, exclui somente o banco gerado e restaura `DATABASE_URL`. O ambiente dedicado dá até 30 segundos aos testes/hooks; os casos com timeout explícito mantêm seus limites.

Corridas são verificadas pela combinação de respostas e pelo estado persistido; não há pausas arbitrárias para forçar uma ordem específica. Para repetir a suíte na validação de estabilidade:

```powershell
pnpm test:integration
pnpm test:integration
```

## Cobertura acrescentada

| Cenário | Evidência verificada |
| --- | --- |
| Matriz anônima | Os 37 endpoints protegidos do OpenAPI retornam 401, envelope estável, Bearer e no-store |
| Perfis ASSESSOR/APOIO | Gestão de equipe/cargos, atividades, modelos e contatos retorna 403 |
| Entradas inválidas | JSON malformado e autoria/status externos não deixam tarefas parciais |
| Fluxo entre módulos | Atividade → checklist → contato → tarefa; snapshots preservados, autoria e histórico de conclusão |
| Arquivamento | Novos vínculos bloqueados, registros e pendências anteriores preservados |
| Logout | Acesso revogado em todos os módulos; outra sessão continua válida |
| JWT | Expiração, assinatura incorreta e cabeçalhos malformados retornam 401 |
| Mudança de cargo | JWT ainda válido passa a refletir os privilégios atuais |
| Desativação | Sessões revogadas, vínculos de tarefas/checklists preservados e novas atribuições bloqueadas |
| Vínculo incompatível | Falha não grava tarefa nem evento parcial de reatribuição |
| Conclusão × cancelamento | Só uma alteração terminal vence, com evento e timestamps consistentes |
| Conclusão × desmarcação | Nunca há tarefa concluída com checklist reaberto |
| Filtros e histórico | Filtros combinados corretos e páginas de eventos sem repetição |

Os testes anteriores cobrem adicionalmente refresh rotativo/reutilização, sessão expirada, última chefia, histórico de cargos, busca de contatos, modelos versionados, geração sem duplicação, paginação, seeds e restrições do banco. Esta etapa amplia a cobertura de RF00–RF04; RF05/RF06 permanecem fora da API implementada.
