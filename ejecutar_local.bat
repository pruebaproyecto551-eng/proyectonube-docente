@echo off
chcp 65001 > nul
title Plataforma Docente MEP - Computación en la Nube UTN

echo ==============================================================================
echo   INICIANDO PLATAFORMA DE GESTIÓN DOCENTE MEP (CLOUD 2026)
echo   Universidad Técnica Nacional (UTN) - Sede Corobicí, Cañas
echo   Docente Evaluadora: Ingrid Chavarría Montero
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias instaladas...
if not exist "backend\node_modules" (
    echo Instalando dependencias de backend...
    call npm --prefix backend install
)
if not exist "frontend\node_modules" (
    echo Instalando dependencias de frontend...
    call npm --prefix frontend install
)

echo.
echo [2/3] Levantando Servidor Backend (Express + REST API + Gemini AI)...
start "Servidor Backend MEP (Puerto 3000)" cmd /k "npm --prefix backend run dev"

timeout /t 2 > nul

echo.
echo [3/3] Levantando Servidor Frontend (React + Vite + Tailwind)...
start "Portal Web Docente MEP (Puerto 5173)" cmd /k "npm --prefix frontend run dev"

timeout /t 3 > nul

echo.
echo ==============================================================================
echo   ¡PLATAFORMA EN EJECUCIÓN CON ÉXITO!
echo   Abriendo navegador en: http://localhost:5173
echo.
echo   CUENTAS DE DEMOSTRACIÓN:
echo   - Docente:     diana@mep.go.cr / teacher123
echo   - Estudiante:  pedro.ramirez@est.mep.go.cr / student123
echo   - Portal Estudiantil: http://localhost:5173/student-portal
echo ==============================================================================
start http://localhost:5173

pause
