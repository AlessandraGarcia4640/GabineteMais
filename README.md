# Gabinete+

Aplicativo mobile e API para gestão de rotinas administrativas em gabinetes de desembargadores.

## Preparação

```powershell
Copy-Item .env.example .env
Set-ExecutionPolicy -Scope Process Bypass
.\bootstrap.ps1
```

## Uso diário

```powershell
docker compose up -d
pnpm dev:api
pnpm dev:mobile
```

## Verificação completa

```powershell
pnpm check
```

O contrato compartilhado é compilado automaticamente pelos comandos da raiz.
Após alterações no Prisma, execute `pnpm db:generate` antes da verificação.

## Usuários de demonstração

Consulte [usuários e permissões](docs/usuarios-e-permissoes.md) para migrations,
seed com senha local e regras de cargos. A API expõe `/health` e os endpoints
`POST /auth/login`, `/auth/refresh` e `/auth/logout`.
Configure a chave JWT e consulte [autenticação](docs/autenticacao.md) antes de iniciar.
GET `/auth/me` consulta o acesso atual. GET `/users/:id/permissions` é restrito à
chefia. As rotas protegidas verificam sessão e perfil atuais. A [gestão de usuários](docs/gestao-usuarios.md)
inclui cadastro administrativo, edição de perfil, histórico de cargos e desativação.
