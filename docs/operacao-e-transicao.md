# Guia de operação e continuidade — etapa 45

Este documento permite transferir a manutenção do projeto a outra pessoa. Não é o módulo RF06 de guia/snapshot de transição dentro do aplicativo, ainda planejado. Consulte também ROADMAP.md, CLAUDE.md e docs/adr.

## 1. Arquitetura e estado de entrega

Monorepo pnpm: apps/api (Node/Express/Prisma/PostgreSQL), apps/mobile (Expo/React Native/Expo Router), packages/shared (schemas Zod/contratos). Router valida entradas, service aplica regras/autorização e repository acessa Prisma. Sessões usam JWT de acesso curto e refresh rotativo persistido com hash. Mobile mantém acesso em memória e refresh no SecureStore nativo; navegador mantém sessão somente em memória. TanStack Query controla consultas/mutações e Zustand controla a sessão.

RF00–RF04 estão implementados: sessão/perfis, rotinas, checklists, contatos e tarefas. Checklists guardam snapshots e tarefas têm histórico/transições restritas. Usuários são desativados, rotinas/contatos/modelos arquivados; não apagar registros com vínculos. RF05 (orientações versionadas) e RF06 (guia de transição/snapshot) não existem como módulos próprios. Marcações de rotinas essenciais e contatos-chave não equivalem ao módulo RF06.

Os PRs de implementação são empilhados e permanecem em rascunho até revisão. CI verde não significa alterações já incorporadas à main. Para receber a versão demonstrável, identificar no GitHub o PR/commit final aprovado e seu histórico de dependências; integrar em ordem ou retargetar/revisar a cadeia. Este guia não executa merges automaticamente.

## 2. Implantação local reproduzível

Pré-requisitos: Node 24+, pnpm 11.14.0 (packageManager), Docker com PostgreSQL 16 e Git. Na raiz do checkout:

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm db:generate
pnpm --filter @gabinete-plus/api exec prisma migrate deploy
pnpm db:seed
```

Antes dos comandos que acessam a API/banco, completar a configuração local:

| Variável | Responsabilidade |
| --- | --- |
| POSTGRES_USER/PASSWORD/DB/PORT | Docker local; valores de exemplo são de desenvolvimento |
| DATABASE_URL | Deve corresponder a esse banco; codificar caracteres especiais de credenciais na URL |
| JWT_ACCESS_SECRET | Segredo local de pelo menos 32 caracteres; não commitar nem compartilhar no guia |
| API_PORT | Padrão 3333 |
| DEMO_SEED_PASSWORD | Senha local de 12–128 caracteres, usada só na criação de contas fictícias |
| DEMO_REFERENCE_DATE | Opcional; fixa data do cenário (AAAA-MM-DD), padrão hoje no gabinete |

Copy-Item deve ser usado na preparação inicial, sem substituir um .env já configurado. NODE_ENV=production bloqueia seed. Variáveis podem estar no .env ignorado pelo Git ou no ambiente do processo; o carregador da API resolve o .env da raiz independentemente do diretório do comando.

Iniciar API e Expo em terminais separados:

```powershell
pnpm dev:api
if (-not (Test-Path -LiteralPath apps/mobile/.env)) { Copy-Item apps/mobile/.env.example apps/mobile/.env }
pnpm dev:mobile
```

Configurar EXPO_PUBLIC_API_URL no .env mobile com o endereço acessível pelo navegador/aparelho e porta da API. Aparelho físico não deve usar localhost do computador como seu próprio endereço. Vars EXPO_PUBLIC ficam públicas no bundle: não contêm senha/JWT secret. URL com credenciais/query/fragmento é recusada. Mudança de endereço requer recarga de desenvolvimento e novo bundle distribuído. Rede, certificados e políticas HTTP de builds nativos ainda precisam de teste em dispositivos.

API: /health verifica processo HTTP; /docs/ existe somente fora de produção. Testar login e consulta real confirma também a comunicação com banco. Dados/contas fictícias estão em [demonstração](demonstracao.md); rerodar seed não redefine senha nem sobrescreve trabalho.

## 3. Uso e manutenção

Chefia mantém rotinas, modelos e contatos; todos os perfis consultam e criam tarefas próprias. Chefia cria tarefa para outra pessoa. Criador/chefia edita/reatribui/cancela; responsável/chefia inicia/conclui. Checklist vinculado deve estar completo para concluir tarefa. Encerradas não reabrem. Depois de arquivar modelos, consultar execuções anteriores pelo histórico.

Antes de mudar código: criar branch sobre base apropriada, ler regras/ADRs e revisar contratos. Mudança de payload começa em shared, atualiza OpenAPI e consumidores no mesmo PR. Gerar client depois de alterar schema; criar migration versionada e testar em banco isolado. Não usar prisma db push como rotina de implantação, nem editar migration já aplicada. Aplicar migrate deploy na implantação após backup validado.

```powershell
pnpm check
pnpm test:integration
pnpm build
pnpm --filter @gabinete-plus/mobile export:web
```

Integrações exigem TEST_DATABASE_URL de teste e usuário com permissão de criar bancos; fixtures criam e apagam somente bancos isolados próprios. CI repete suites mobile e integração, aplica migrations, executa seed duas vezes e verifica backup/restauração. Não apontar testes para ambiente com dados reais. Compilar/exportar não é testar layout ou performance em aparelhos.

## 4. Backup

Os scripts usam pg_dump/pg_restore 16 dentro do container, sem shell e com bytes diretos em arquivo, evitando conversão de saída binária no PowerShell. O backup custom inclui schema, dados e tabela de migrations deste banco; não inclui papéis globais do cluster, .env, chave JWT, certificados nem builds. Proteger esses itens separadamente com responsável definido.

```powershell
pnpm db:backup -- --file backups/gabinete.dump
Get-FileHash -Algorithm SHA256 backups/gabinete.dump
```

Chamada direta equivalente (o script também aceita separador -- encaminhado pelo pnpm):

```powershell
node --env-file=.env scripts/db-backup.mjs --file backups/gabinete.dump
```

Container padrão gabinete-plus-postgres, banco/usuário de POSTGRES_DB/POSTGRES_USER ou gabinete_plus/gabinete. Pode informar --container, --database e --user. Arquivo existente não é sobrescrito; use nome novo em cada backup. Sucesso exige saída zero. Hash ajuda a verificar transporte/armazenamento; restauração periódica em banco separado comprova recuperabilidade. Guardar arquivos e segredos fora do repositório, com acesso restrito, proteção em repouso e retenção acordada. backups/ e *.dump são ignorados pelo Git; isso não substitui proteção do armazenamento.

## 5. Restauração controlada

Restaurar somente arquivo confiável, preferencialmente primeiro em banco separado previamente criado. O conteúdo de um dump pode executar SQL; o formato custom/assinatura PGDMP não prova origem. Criar usuário/banco de destino autorizados e registrar qual backup/commit/migrations serão usados.

1. Parar a API e interromper gravações no destino. Fazer backup do estado atual antes de substituir dados. Conferir container, banco e arquivo.
2. Definir a confirmação **com exatamente o nome do banco de destino**. O script substitui objetos desse banco e não cria, apaga ou troca o próprio banco.

```powershell
$env:GABINETE_RESTORE_CONFIRM = 'gabinete_recuperacao'
node --env-file=.env scripts/db-restore.mjs --database gabinete_recuperacao --file backups/gabinete.dump
Remove-Item Env:GABINETE_RESTORE_CONFIRM
```

3. pg_restore usa transação única, encerra em erro, não restaura proprietários/grants e não usa --create. Depois, o script revoga sessões restauradas e elimina hashes de refresh, para não ressuscitar acessos antigos. Se qualquer parte falhar, manter API parada: a revogação ocorre depois da transação do restore e seu erro também produz falha do comando.
4. Revisar contas ativas/cargos e alterações de senha que voltaram ao estado do backup. Rotacionar JWT_ACCESS_SECRET, ajustar DATABASE_URL para o destino pretendido e aplicar migrations posteriores compatíveis. Não publicar o ambiente antes de validar usuários, vínculos, snapshots, eventos e acesso com novo login.
5. Reiniciar API, testar /health, login, consultas e uma jornada fictícia controlada. Registrar tempo de recuperação e resultado. Confirmar revogação de sessões antigas. Liberar acesso somente depois dessas verificações.

O ensaio do CI usa banco de destino criado exclusivamente para o teste, compara fingerprints das tabelas de negócio/migrations e confirma que sessões/hash de refresh são invalidados somente no destino. Ele não restaura sobre o ambiente de trabalho local. Scripts aceitam identificadores simples; outros cenários/versões exigem adaptação e ensaio.

Referências primárias: [pg_dump 16](https://www.postgresql.org/docs/16/app-pgdump.html) e [pg_restore 16](https://www.postgresql.org/docs/16/app-pgrestore.html).

## 6. Diagnóstico e passagem para outra pessoa

Falha de conexão: conferir processo API, host/porta vistos pelo aparelho, firewall/certificado e URL do bundle. Banco indisponível: verificar healthcheck do container, DATABASE_URL e migrations. Login: conferir senha da primeira criação, conta ativa, perfil e chave JWT; não redefinir dados repetindo seed. 403 atualiza perfil; perda de sessão pede novo login. Tarefa não conclui: revisar estado e checklist pendente; não editar banco para contornar regra. Erro de contrato: rever shared/OpenAPI/consumidores e executar testes antes de distribuir.

Entregar ao sucessor: acesso autorizado ao GitHub/CI, checkout/commit aprovado, inventário de ambientes, segredos por canal próprio, procedimento e localização dos backups, resultado de restauração recente, responsáveis por contas/infraestrutura, lacunas e roteiro de demonstração. Não anexar senhas, dumps ou dados judiciais a issues/PRs.

## 7. Limitações atuais

RF05/RF06 não implementados; MVP total permanece incompleto. Build instalável/assinado, teste físico Android/iOS, TalkBack/VoiceOver, fontes a 200%, fidelidade Figma e validação com usuários pendentes. Sem fila offline, persistência de rascunhos ou versionamento de campos concorrentes. CORS aberto, TLS/proxy, papéis mínimos de banco, política de backups e endurecimento de produção ainda precisam ser definidos antes de uso real. Guia/documentação e CI não representam homologação de produção.
