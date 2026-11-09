@echo off
rem ===========================================================================
rem  Einnahmeplaner starten - mit einem Doppelklick
rem  1. Beim ersten Mal: Pakete installieren und ein Symbol auf den Desktop legen
rem  2. Frontend bauen (fertige Dateien landen in frontend\dist)
rem  3. Server starten (laeuft minimiert unten in der Taskleiste)
rem  4. App in einem eigenen Fenster ohne Adressleiste oeffnen
rem ===========================================================================
title Einnahmeplaner wird gestartet ...
cd /d "%~dp0"

rem ---- 1. Erster Start ----
if not exist "frontend\node_modules" (
  echo Erster Start: Pakete werden installiert. Das dauert nur beim ersten Mal etwas.
  pushd frontend
  call npm install
  popd
)
powershell -NoProfile -Command "$l = Join-Path ([Environment]::GetFolderPath(Desktop)) Einnahmeplaner.lnk; if (!(Test-Path $l)) { $s = (New-Object -ComObject WScript.Shell).CreateShortcut($l); $s.TargetPath = %~dp0Einnahmeplaner.bat; $s.WorkingDirectory = %~dp0; $s.IconLocation = %~dp0einnahmeplaner.ico; $s.WindowStyle = 7; $s.Save(); Write-Host Symbol auf dem Desktop angelegt. }"

rem ---- 2. Frontend bauen ----
echo Baue die App ...
pushd frontend
call npm run build-only >nul 2>&1
if errorlevel 1 (
  echo Fehler beim Bauen des Frontends. Bitte start-frontend.bat starten und die Meldung ansehen.
  popd
  pause
  exit /b
)
popd

rem ---- 3. Server starten, falls er nicht schon laeuft ----
netstat -an | find ":8000 " | find "LISTENING" >nul
if errorlevel 1 (
  start "Einnahmeplaner Server - zum Beenden dieses Fenster schliessen" /min /d "%~dp0backend" deno run --allow-net --allow-read --allow-write --unstable-kv main.ts
  timeout /t 3 /nobreak >nul
)

rem ---- 4. App-Fenster oeffnen ----
start "" msedge --app=http://localhost:8000
