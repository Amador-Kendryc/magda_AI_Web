@echo off
title MAGDA AI — ServicioMagda :3002
cd /d "c:\Users\final\Downloads\PUBLI TINGO\magda-web\ServicioMagda"
echo [ServicioMagda] Iniciando en puerto 3002...
:loop
node src/index.js
echo [ServicioMagda] Proceso terminado. Reiniciando en 3 segundos...
timeout /t 3 /nobreak
goto loop
