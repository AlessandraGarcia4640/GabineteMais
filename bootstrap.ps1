$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "Bootstrap do Gabinete+ iniciado." -ForegroundColor Cyan
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw "pnpm não foi encontrado." }
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
if (-not (Test-Path "apps\mobile\package.json")) {
  if (Test-Path "apps\mobile") {
    $items = Get-ChildItem "apps\mobile" -Force
    if ($items.Count -eq 0) { Remove-Item "apps\mobile" -Force } else { throw "apps/mobile existe e não está vazio." }
  }
  pnpm dlx create-expo-app@latest apps/mobile --template default@sdk-54 --yes --no-install --no-agents-md
  if ($LASTEXITCODE -ne 0) { throw "Falha ao criar o aplicativo Expo." }
  $p = Get-Content "apps\mobile\package.json" -Raw | ConvertFrom-Json
  $p.name = "@gabinete-plus/mobile"
  $p.private = $true
  if (-not $p.scripts.dev) { $p.scripts | Add-Member -NotePropertyName dev -NotePropertyValue "expo start" }
  if (-not $p.scripts.typecheck) { $p.scripts | Add-Member -NotePropertyName typecheck -NotePropertyValue "tsc --noEmit" }
  if (-not $p.scripts.test) { $p.scripts | Add-Member -NotePropertyName test -NotePropertyValue "echo 'Testes mobile serão adicionados na Fase 4.'" }
  $p | ConvertTo-Json -Depth 20 | Set-Content "apps\mobile\package.json" -Encoding UTF8
}
pnpm install
if ($LASTEXITCODE -ne 0) { throw "Falha no pnpm install." }
pnpm db:generate
if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar o Prisma Client." }
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "Falha ao subir o PostgreSQL." }
Write-Host "Bootstrap concluído." -ForegroundColor Green
Write-Host "Agora execute: pnpm db:migrate; pnpm check; pnpm dev:api; pnpm dev:mobile"
