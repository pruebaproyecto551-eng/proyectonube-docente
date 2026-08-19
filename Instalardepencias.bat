@echo off
title Instalacion - Proyectonube_Docente

echo ==========================================
echo   INSTALANDO PROYECTONUBE_DOCENTE
echo ==========================================
echo.

echo [1/3] Dependencias principales...
call npm install
if errorlevel 1 goto error

echo.
echo [2/3] Dependencias Frontend...
call npm --prefix frontend install
if errorlevel 1 goto error

echo.
echo [3/3] Dependencias Backend...
call npm --prefix backend install
if errorlevel 1 goto error

echo.
echo ==========================================
echo INSTALACION COMPLETADA
echo ==========================================
echo.

pause
exit /b 0

:error
echo.
echo ERROR: La instalacion fallo.
pause
exit /b 1