@echo off
echo Beende alten Server auf Port 5173 ...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force; Write-Host Beendet: $_.OwningProcess }"
echo Fertig.
pause
