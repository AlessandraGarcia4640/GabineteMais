# ADR 0018 — Backup e restauração operacionais

Status: aceita.

Ferramentas de continuidade usam Node nativo e clientes PostgreSQL 16 dentro do container Docker existente. Formato custom e descritores de arquivo preservam bytes entre Windows/Linux, sem redirecionamento textual do PowerShell. Identificadores são validados; processos recebem argumentos separados e shell:false. Backup não sobrescreve arquivo; falha remove apenas arquivo criado por aquela execução.

Restauração exige confirmação explícita do banco de destino, não usa --create e executa pg_restore com --single-transaction/--exit-on-error. Proprietários e privilégios do dump não são replicados. O operador mantém API parada até concluir todas as verificações. Depois de restaurar, sessões são revogadas e hashes de refresh removidos para não recuperar acessos antigos. Revogação é uma transação posterior; se falhar, o comando falha e a API deve continuar parada. Chave JWT e demais segredos são tratados separadamente pelo operador.

São scripts de infraestrutura, sem Prisma nem dependências adicionais, separados dos contratos de produto. Unit tests verificam guardas/bytes/erros. Ensaio CI usa banco descartável criado pelo teste, compara conteúdo das tabelas de negócio/migrations e verifica revogação apenas no destino. O teste legado de seed que alterava o banco configurado foi isolado antes de habilitar esse ensaio.

Guia não equivale ao RF06 nem homologação de produção. Roles globais, segredos, TLS/certificados e políticas de acesso/retenção/encriptação não fazem parte do dump de um banco e exigem procedimentos operacionais próprios.
