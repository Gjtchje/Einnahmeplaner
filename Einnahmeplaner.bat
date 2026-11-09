@echo off
rem Einnahmeplaner mit einem Doppelklick starten
cd /d "%~dp0"

rem 1. Frontend bauen: aus den .vue-Dateien werden fertige Dateien in frontend\dist
cd frontend
if not exist node_modules call npm install
call npm run build-only
cd ..

rem 2. Server starten (laeuft minimiert unten in der Taskleiste)
start "Einnahmeplaner Server" /min /d backend deno run --allow-net --allow-read --allow-write --unstable-kv main.ts

rem 3. Warten, bis der Server antwortet (jede Sekunde nachfragen)
echo Warte auf den Server ...
:warten
timeout /t 1 >nul
curl -s -o nul http://localhost:8000/api/katalog || goto warten

rem 4. App in einem eigenen Fenster ohne Adressleiste oeffnen
start msedge --app=http://localhost:8000
