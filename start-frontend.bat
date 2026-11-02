@echo off
title Einnahmeplaner Frontend
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Erster Start: installiere Abhaengigkeiten ...
  call npm install
)
call npm run dev
pause
