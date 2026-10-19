@echo off
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-phone-preview.ps1"
pause
