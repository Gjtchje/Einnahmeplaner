@echo off
title Einnahmeplaner - mit GitHub verbinden
cd /d "%~dp0"
echo Verbinde den Einnahmeplaner mit https://github.com/Gjtchje/Einnahmeplaner
echo (Das Repository muss auf GitHub schon angelegt sein - leer, ohne README.)
echo.
pause
if not exist .git call git init -b main
git remote get-url origin >nul 2>&1 || call git remote add origin https://github.com/Gjtchje/Einnahmeplaner.git
call git add -A
call git commit -m "Einnahmeplaner: erste Version"
call git branch -M main
call git push -u origin main
echo.
echo Fertig! Ab jetzt reicht speichern.bat zum Sichern.
pause
