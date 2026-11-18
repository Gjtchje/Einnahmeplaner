@echo off
title Einnahmeplaner Backend
cd /d "%~dp0backend"

rem Laeuft schon ein Server auf Port 8000 (z. B. von Einnahmeplaner.bat)? Dann zuerst beenden,
rem sonst kommt der Fehler "AddrInUse".
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /R /C:"TCP *[^ ]*:8000 "') do (
  echo Alter Server auf Port 8000 wird beendet ...
  taskkill /PID %%p /F >nul 2>&1
)

call deno task dev
pause
