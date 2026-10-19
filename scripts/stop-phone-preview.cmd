@echo off
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\stop-phone-preview.ps1"
pause
