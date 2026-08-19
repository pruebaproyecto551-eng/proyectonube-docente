@echo off
title Portal Docente CINDEA - Sistema Cloud MEP
echo ================================================================
echo       PORTAL DOCENTE INTEGRADO MEP - CLOUD PLATFORM 2026
echo ================================================================
echo.

REM Moverse al directorio del script
cd /d "%~dp0"

REM Matar procesos previos en los puertos 3000 y 5173
echo Verificando puertos...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 "') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 "') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 /nobreak >nul

REM Compilar backend si no existe la carpeta dist
if not exist "%~dp0backend\dist" (
  echo Compilando Backend...
  call npm --prefix "%~dp0backend" run build
)

REM Iniciar Backend
echo [1/2] Iniciando Backend en puerto 3000...
start "Backend MEP Cloud" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak >nul

REM Iniciar Frontend
echo [2/2] Iniciando Frontend en puerto 5173...
start "Frontend MEP Cloud" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --port 5173 --host"

echo.
echo ================================================================
echo Plataforma lista. Abriendo en el navegador...
echo ================================================================
timeout /t 4 /nobreak >nul
start http://localhost:5173