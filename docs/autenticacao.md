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
são removidos; a senha não é alterada. E-mail é consultado exatamente como armazenado.
Campos extras (incluindo role/permissões) são rejeitados.

```powershell
$payload = @{ email = 'chefia@example.invalid'; password = $env:DEMO_SEED_PASSWORD } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3333/auth/login -ContentType 'application/json' -Body $payload
```

200 retorna accessToken, tokenType Bearer, expiresIn 900 e usuário público.
401 retorna INVALID_CREDENTIALS para senha incorreta, conta inexistente ou inativa.
400 indica validação ou JSON inválido; 413 indica corpo maior que 1 MB; 429 indica
20 tentativas por IP em 15 minutos. O servidor nunca devolve passwordHash.
O contrato completo e exemplo fictício estão em `openapi/`.

## Estado dos consumidores

Mobile já reutiliza os schemas de entrada e resposta do shared. A tela, cliente
HTTP e armazenamento em expo-secure-store serão implementados na #34. Não guardar
accessToken no Zustand atual. O exemplo de OpenAPI é um mock, não um JWT utilizável.

## Verificação e dependências

`pnpm check` cobre login HTTP com repository substituído, erros de entrada,
rate limit, assinatura e expiração de JWT, além da base da #23.
No CI, TEST_DATABASE_URL habilita o teste adicional com PostgreSQL 16 real.
Ele cria banco isolado, aplica migrations, prepara usuários e verifica login,
senha incorreta e desativação; ao final remove somente o banco criado pelo teste.

Refresh/logout, autenticação de rotas, convites e tela mobile ainda não estão
implementados. O login não completa sozinho RF00. Veja ADR-003.
