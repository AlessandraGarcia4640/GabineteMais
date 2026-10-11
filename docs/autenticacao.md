# Login — issue #24

## Configuração local

Copie `.env.example` para `.env` e configure o PostgreSQL. JWT_ACCESS_SECRET é
obrigatório; gere uma chave aleatória para uso local, sem publicá-la:

```powershell
$env:JWT_ACCESS_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Execute esse comando no terminal da API, dos testes e do seed, ou guarde a chave
no `.env` local ignorado pelo Git. O campo vazio em `.env.example` é intencional.
`pnpm db:generate`, migrations e `pnpm db:seed` preparam as contas conforme
`docs/usuarios-e-permissoes.md`. Não use valores de chave do CI em hospedagem.

## Endpoint

POST /auth/login, corpo JSON: email e password. Espaços nas extremidades do e-mail
são removidos; a senha não é alterada. E-mail é consultado sem distinguir caixa.
Campos extras (incluindo role/permissões) são rejeitados.

```powershell
$payload = @{ email = 'chefia@example.invalid'; password = $env:DEMO_SEED_PASSWORD } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3333/auth/login -ContentType 'application/json' -Body $payload
```

200 retorna accessToken, refreshToken, refreshExpiresAt, tokenType Bearer,
expiresIn 900 e usuário público. Refresh tokens têm 256 bits aleatórios e somente
seus hashes são persistidos; a sessão expira sete dias após o login.
401 retorna INVALID_CREDENTIALS para senha incorreta, conta inexistente ou inativa.
400 indica validação ou JSON inválido; 413 indica corpo maior que 1 MB; 429 indica
20 tentativas por IP em 15 minutos. O servidor nunca devolve passwordHash.
O contrato completo e exemplo fictício estão em `openapi/`.

## Renovação e logout — issue #25

POST /auth/refresh recebe `{ "refreshToken": "token atual" }` e retorna o mesmo
formato do login, com novos tokens. refreshExpiresAt não muda. Token anterior
fica consumido; reutilizá-lo revoga a sessão inteira. Token expirado/revogado,
desconhecido ou usuário desativado recebem 401 INVALID_REFRESH_TOKEN.

POST /auth/logout recebe o mesmo formato e retorna 204 sem corpo, inclusive
em chamadas repetidas ou token desconhecido. Revoga somente a sessão informada,
preservando outros dispositivos. Qualquer token dessa sessão, inclusive antigo,
pode ser usado para revogá-la. Limites separados: login 20, refresh 60, logout
120 chamadas por IP em 15 minutos. Todas as respostas desses endpoints usam no-store.

No cliente, serializar refresh e guardar o novo token antes da próxima renovação.
Após 401, limpar os tokens e solicitar login. Não repetir refresh antigo quando
houver dúvida se foi consumido. Ao sair, limpar access e refresh do armazenamento
seguro mesmo se a rede falhar; a revogação no servidor só ocorre se ele receber logout.
Não armazenar tokens no Zustand.

Access tokens incluem sid. As rotas protegidas consultam sessão e usuário no banco
e rejeitam imediatamente tokens de sessões encerradas ou usuários desativados.

## Rotas protegidas — issue #26

GET /auth/me exige Authorization Bearer e retorna usuário e permissões atuais.
GET /users/:id/permissions exige chefia e team:manage para consulta administrativa.
401 indica sessão inválida; 403 indica falta de permissão; 404 indica alvo inexistente
após autorização. O perfil atual no banco prevalece sobre perfil antigo no token.
Tokens não são aceitos em query ou corpo. Respostas protegidas usam no-store.
Veja ADR-005 e a matriz aplicada; as próximas rotas usarão os mesmos services.

## Estado dos consumidores

Mobile já reutiliza os schemas de entrada e resposta do shared. A tela, cliente
HTTP e armazenamento em expo-secure-store serão implementados na #34. Não guardar
accessToken no Zustand atual. O exemplo de OpenAPI é um mock, não um JWT utilizável.

## Verificação e dependências

`pnpm check` cobre login HTTP com repository substituído, erros de entrada,
rate limit, assinatura e expiração de JWT, além da base da #23.
No CI, TEST_DATABASE_URL habilita o teste adicional com PostgreSQL 16 real.
Ele cria banco isolado, aplica migrations, prepara usuários e verifica login,
rotação, replay, concorrência, rollback, expiração, logout e desativação;
ao final remove somente o banco criado pelo teste.

CRUD administrativo de usuários foi implementado na #27; convites e tela mobile ainda não estão implementados.
Esses endpoints não completam sozinhos RF00. Veja ADR-003, ADR-004 e ADR-005.
