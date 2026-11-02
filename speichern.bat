@echo off
title Einnahmeplaner - Stand speichern
cd /d "%~dp0"
if not exist .git (
  echo Noch kein Git-Repository - lege eins an ...
  call git init -b main
)
echo Geaenderte Dateien:
call git status --short
echo.
set /p MSG=Beschreibung fuer diesen Stand (z. B. "Planer: Konfliktmeldung"): 
if "%MSG%"=="" set MSG=Zwischenstand
call git add -A
call git commit -m "%MSG%"
git remote get-url origin >nul 2>&1 && call git push
echo.
echo Fertig! Du kannst das Fenster schliessen.
pause
