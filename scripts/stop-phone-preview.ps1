$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

Write-Host "Encerrando o PostgreSQL local do Gabinete+..." -ForegroundColor Cyan
docker compose stop postgres
Write-Host "PostgreSQL encerrado." -ForegroundColor Green
