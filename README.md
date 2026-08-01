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
