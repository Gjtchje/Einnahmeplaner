@echo off
title Einnahmeplaner Frontend
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Erster Start: installiere Abhaengigkeiten ...
  call npm install
)

rem nach ein paar Sekunden die App in Firefox oeffnen (Port 5173)
start "" cmd /c "timeout /t 4 >nul & start firefox http://localhost:5173"

call npm run dev
pause
