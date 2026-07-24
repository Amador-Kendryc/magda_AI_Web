@echo off
title MAGDA AI — Iniciando servicios...
echo ============================================
echo    MAGDA AI x TINGO — Portal SOA v2
echo ============================================
echo.

:: Verificar que node existe
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no encontrado. Instala Node.js primero.
    pause
    exit /b 1
)

echo Iniciando ServicioAuth en puerto 3001...
start "MAGDA - Auth :3001" cmd /k "cd /d "c:\Users\final\Downloads\PUBLI TINGO\magda-web\ServicioAuth" && echo [Auth] Corriendo en http://localhost:3001 && node src/index.js"

timeout /t 3 /nobreak > nul

echo Iniciando ServicioMagda en puerto 3002...
start "MAGDA - Magda :3002" cmd /k "cd /d "c:\Users\final\Downloads\PUBLI TINGO\magda-web\ServicioMagda" && echo [Magda] Corriendo en http://localhost:3002 && node src/index.js"

timeout /t 4 /nobreak > nul

echo.
echo Abriendo el portal en el navegador...
start "" "http://localhost:3002"

echo.
echo ============================================
echo  Servicios corriendo. No cierres las
echo  ventanas negras que se abrieron.
echo ============================================
echo.
pause
