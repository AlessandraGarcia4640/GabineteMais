# Dados de demonstração — etapa 44

Execute migrations/client Prisma antes do seed. Configure DEMO_SEED_PASSWORD localmente, com 12 a 128 caracteres; nunca commite a senha. DEMO_REFERENCE_DATE é opcional (AAAA-MM-DD, 2000–2099), padrão hoje em America/Sao_Paulo. Uma data fixa permite reprodução do mesmo cenário em banco novo. `pnpm db:seed` prepara automaticamente usuários, rotinas, modelos, contatos, execuções, tarefas e eventos; é bloqueado com NODE_ENV=production.

| Conta fictícia | Perfil/cargo |
| --- | --- |
| magistrado@example.invalid | Chefia / magistrado gestor |
| chefia@example.invalid | Chefia / assessor-chefe |
| assessor1@example.invalid | Assessoria |
| assessor2@example.invalid | Assessoria |
| apoio@example.invalid | Apoio |

A senha é o valor de DEMO_SEED_PASSWORD **na primeira criação**. Rerodar não troca senhas, nomes, cargos nem reativa contas. Se dados/contas forem alterados, use banco novo para reproduzir o cenário original; o seed não apaga trabalho. Pré-requisitos arquivados/inativados e conflitos com execução de usuário produzem erro explícito.

## Cenário

Três rotinas (diária, semanal, eventual), contatos fictícios e modelo de e-mail. Assessor 1 possui execução atual parcialmente marcada e execução concluída do dia anterior, com snapshots/autoria. Há tarefas abertas, em andamento, concluídas e canceladas, com eventos coerentes e vínculos a rotina/contato/checklist. Apoio possui tarefa urgente com prazo anterior à referência. O atraso efetivo é calculado em relação ao dia atual da API, portanto referência futura pode não aparecer como atraso.

Entrar como assessor 1, abrir tarefa em andamento, consultar checklist, concluir itens e finalizar tarefa. Como apoio, consultar pendência urgente. Como chefia, verificar histórico e recursos de atribuição/arquivo. Sem dados processuais ou canais reais; nenhum e-mail usa domínio entregável.

Idempotência refere-se à mesma referência e registros intactos: repetir não duplica itens/eventos nem redefine snapshots/status/textos. Teste PostgreSQL roda seed duas vezes, verifica papéis/estados/progresso, preservação de senha e alteração feita pelo usuário. CI também executa o comando de seed duas vezes. Isso não cria RF05/RF06, que continuam planejados.

O ensaio revelou um teste legado de usuários que inativava conta diretamente no banco configurado por TEST_DATABASE_URL. Ele foi migrado para a fixture de banco próprio, evitando contaminação do ambiente de seed. A proteção do seed contra reativação/sobrescrita foi preservada.
