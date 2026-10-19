param(
  [string]$DemoPassword = "GabineteMais2026!"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Require-Command([string]$Name, [string]$Help) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Falta: $Name" -ForegroundColor Red
    Write-Host $Help -ForegroundColor Yellow
    exit 1
  }
}

Require-Command "docker" "Instale e abra o Docker Desktop."
Require-Command "node" "Instale o Node.js 24 ou superior."
Require-Command "pnpm" "Instale o pnpm 11 ou superior: npm install -g pnpm@11.14.0"

if (-not (Test-Path ".env")) {
  $jwt = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
  @"
POSTGRES_USER=gabinete
POSTGRES_PASSWORD=gabinete_local
POSTGRES_DB=gabinete_plus
POSTGRES_PORT=5432
DATABASE_URL=postgresql://gabinete:gabinete_local@localhost:5432/gabinete_plus?schema=public
API_PORT=3333
JWT_ACCESS_SECRET=$jwt
"@ | Set-Content ".env" -Encoding utf8
  Write-Host "Arquivo .env local criado." -ForegroundColor Green
}

Write-Host "Iniciando PostgreSQL..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host "Instalando/verificando dependencias..." -ForegroundColor Cyan
pnpm install --frozen-lockfile

Write-Host "Gerando Prisma Client..." -ForegroundColor Cyan
pnpm db:generate

Write-Host "Aplicando migrations..." -ForegroundColor Cyan
pnpm --filter @gabinete-plus/api exec prisma migrate deploy

$env:DEMO_SEED_PASSWORD = $DemoPassword
$env:NODE_ENV = "development"
Write-Host "Preparando dados ficticios de demonstracao..." -ForegroundColor Cyan
pnpm db:seed

$ip = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notmatch '^127\.' -and
    $_.IPAddress -notmatch '^169\.254\.' -and
    $_.AddressState -eq 'Preferred'
  } |
  Sort-Object -Property InterfaceMetric |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
  Write-Host "Nao foi possivel descobrir automaticamente o IP local." -ForegroundColor Yellow
  Write-Host "Execute ipconfig e procure o IPv4 do Wi-Fi." -ForegroundColor Yellow
} else {
  Write-Host ""
  Write-Host "==============================================" -ForegroundColor Green
  Write-Host "No Samsung, informe este endereco no Gabinete+:" -ForegroundColor Green
  Write-Host "http://$($ip):3333" -ForegroundColor White
  Write-Host "==============================================" -ForegroundColor Green
  Write-Host ""
}

Write-Host "Credencial de demonstracao:" -ForegroundColor Cyan
Write-Host "  E-mail: chefia@example.invalid"
Write-Host "  Senha : $DemoPassword"
Write-Host ""
Write-Host "Mantenha esta janela aberta enquanto usar o app no celular." -ForegroundColor Yellow
Write-Host "Se o Windows perguntar sobre acesso de rede do Node.js, permita em redes privadas." -ForegroundColor Yellow
Write-Host ""

pnpm dev:api
