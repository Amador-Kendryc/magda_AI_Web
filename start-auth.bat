@echo off
title MAGDA AI — ServicioAuth :3001
cd /d "c:\Users\final\Downloads\PUBLI TINGO\magda-web\ServicioAuth"
echo [ServicioAuth] Iniciando en puerto 3001...
:loop
node src/index.js
echo [ServicioAuth] Proceso terminado. Reiniciando en 3 segundos...
timeout /t 3 /nobreak
goto loop
