@echo off
title Einnahmeplaner Tests
cd /d "%~dp0backend"
call deno task test
pause
