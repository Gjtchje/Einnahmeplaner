@echo off
title Einnahmeplaner Backend
cd /d "%~dp0backend"
call deno task dev
pause
