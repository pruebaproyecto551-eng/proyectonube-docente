@echo off
title Proyectonube_Docente
color 0A

echo.
echo ==========================================
echo       PROYECTONUBE_DOCENTE
echo ==========================================
echo.

echo [1/2] Iniciando Docker (PostgreSQL + Adminer)...
docker compose up -d
if errorlevel 1 (
    echo.
    echo [ERROR] Docker no esta disponible.
    echo Abre Docker Desktop y vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Contenedores iniciados.
echo.

echo [2/2] Servicios disponibles:
echo.
echo   Frontend   : http://localhost:5173
echo   Backend    : http://localhost:3000
echo   Health     : http://localhost:3000/health
echo   Adminer    : http://localhost:8080
echo   PostgreSQL : localhost:5432
echo.
echo ==========================================
echo   Adminer (administrador de BD):
echo     URL          http://localhost:8080
echo     Sistema      PostgreSQL
echo     Servidor     postgres
echo     Usuario      root
echo     Contrasena   root
echo     Base datos   profesora
echo ==========================================
echo.
echo ==========================================
echo       APLICACION INICIADA
echo ==========================================
echo.

call npm run dev
pause
