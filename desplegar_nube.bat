@echo off
chcp 65001 > nul
title Despliegue en la Nube - Plataforma Docente MEP

echo ==============================================================================
echo   DESPLIEGUE EN LA NUBE (PaaS / Docker / Railway / Render)
echo   Proyecto: Plataforma de Gestión Docente MEP
echo ==============================================================================
echo.

echo Opciones de Despliegue:
echo 1. Desplegar con Docker Local / Contenedores (docker-compose up -d)
echo 2. Construir imagen Docker de producción (docker build -t portal-docente-mep .)
echo 3. Preparar repositorio para Railway / Render / Fly.io
echo 4. Salir
echo.

set /p opcion="Selecciona una opción (1-4): "

if "%opcion%"=="1" (
    echo Levantando contenedores Docker con PostgreSQL y Adminer...
    docker-compose up -d
    echo.
    echo Contenedores levantados. Abre http://localhost:8080 para Adminer.
    pause
)

if "%opcion%"=="2" (
    echo Construyendo imagen Docker de Producción...
    docker build -t portal-docente-mep:latest .
    echo.
    echo Imagen construida con éxito: portal-docente-mep:latest
    pause
)

if "%opcion%"=="3" (
    echo Para desplegar en Railway o Render:
    echo 1. Sube este proyecto a tu repositorio GitHub:
    echo    git add .
    echo    git commit -m "Deploy: Plataforma Docente MEP"
    echo    git push origin main
    echo 2. Entra a Railway.app o Render.com y conecta tu repositorio.
    echo 3. ¡El archivo Dockerfile / railway.json / render.yaml configurará todo automáticamente!
    pause
)

echo Saliendo...
