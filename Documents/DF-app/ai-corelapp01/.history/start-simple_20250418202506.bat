@echo off
title AI Design Agent - Eenvoudige Opstart Script
setlocal enabledelayedexpansion

echo ----------------------------------------------
echo        AI Design Agent - Opstart Script
echo ----------------------------------------------

:: Check of Docker is geïnstalleerd
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker is niet geïnstalleerd. Installeer Docker om door te gaan.
    pause
    exit /b 1
)

:: Controleer of .env bestanden bestaan, zo niet, maak ze aan
if not exist ".\server\.env" (
    echo Server .env bestand niet gevonden. Aanmaken van default versie...
    (
        echo PORT=4000
        echo NODE_ENV=development
        echo CLIENT_ORIGIN=http://localhost:3001
        echo OLLAMA_HOST=ollama
        echo OLLAMA_PORT=11435
        echo CHROMA_HOST=chromadb
        echo CHROMA_PORT=8001
        echo CORELDRAW_HOST=localhost
        echo CORELDRAW_PORT=4500
        echo BLENDER_HOST=localhost
        echo BLENDER_PORT=4600
        echo LOG_LEVEL=debug
    ) > .\server\.env
    echo Server .env aangemaakt.
)

if not exist ".\client\.env" (
    echo Client .env bestand niet gevonden. Aanmaken van default versie...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:4000
        echo NEXT_PUBLIC_WS_URL=ws://localhost:4000
    ) > .\client\.env
    echo Client .env aangemaakt.
)

:: Docker containers opstarten
echo Docker containers opstarten...
docker-compose down
docker-compose up -d

:: Wacht tot de services beschikbaar zijn
echo Wachten tot services beschikbaar zijn...
timeout /t 5 /nobreak >nul

:: Test of de server bereikbaar is
echo Controleren of de server bereikbaar is...
set MAX_RETRIES=10
set RETRY_COUNT=0

:server_check_loop
if %RETRY_COUNT% lss %MAX_RETRIES% (
    curl -s http://localhost:4000/api/health >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo Server is bereikbaar!
        goto :server_check_done
    ) else (
        set /a RETRY_COUNT+=1
        if !RETRY_COUNT! equ %MAX_RETRIES% (
            echo Server niet bereikbaar na %MAX_RETRIES% pogingen.
        ) else (
            echo Wachten op server (poging !RETRY_COUNT!/%MAX_RETRIES%)...
            timeout /t 3 /nobreak >nul
            goto :server_check_loop
        )
    )
)
:server_check_done

:: Wacht even voordat je de browser opent
echo Even wachten voordat de browser wordt geopend...
timeout /t 5 /nobreak >nul

:: Open de frontend in de browser (meerdere methoden proberen)
echo Frontend openen in browser...

:: Methode 1: via start commando (meest voorkomend)
start http://localhost:3001

:: Methode 2: via explorer commando (alternatief)
explorer "http://localhost:3001"

echo.
echo Applicatie is gestart!
echo ----------------------------------------------
echo Frontend: http://localhost:3001
echo Backend API: http://localhost:4000/api
echo Chat Interface: http://localhost:3001/chat
echo ----------------------------------------------
echo.
echo Gebruik 'docker-compose logs' om de logs te bekijken.
echo Gebruik 'docker-compose down' om de applicatie te stoppen.
echo.

pause 