@echo off
title AI Design Agent - Opstart Script
setlocal enabledelayedexpansion

:: Banner weergeven
echo ======================================================
echo             AI Design Agent - Opstart Script       
echo ======================================================
echo.

:: Check of Docker is geïnstalleerd
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo FOUT: Docker is niet geïnstalleerd. Installeer Docker om door te gaan.
    pause
    exit /b 1
)

:: Check of Ollama is geïnstalleerd (optioneel)
where ollama >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WAARSCHUWING: Ollama is niet geïnstalleerd. Het wordt aanbevolen om Ollama te installeren.
    echo Download van: https://ollama.com/download
)

:: Controleer of .env bestanden bestaan, zo niet, maak ze aan
if not exist ".\server\.env" (
    echo INFO: Server .env bestand niet gevonden. Aanmaken van default versie...
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
    echo INFO: Server .env aangemaakt.
)

if not exist ".\client\.env" (
    echo INFO: Client .env bestand niet gevonden. Aanmaken van default versie...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:4000
        echo NEXT_PUBLIC_WS_URL=ws://localhost:4000
    ) > .\client\.env
    echo INFO: Client .env aangemaakt.
)

:: Docker containers opstarten
echo INFO: Docker containers opstarten...
docker-compose down
docker-compose up -d

:: Wacht tot de services beschikbaar zijn
echo INFO: Wachten tot services beschikbaar zijn (5 seconden)...
timeout /t 5 /nobreak >nul

:: Test of de server bereikbaar is
echo INFO: Controleren of de server bereikbaar is...
set MAX_RETRIES=15
set RETRY_COUNT=0

:server_check_loop
if %RETRY_COUNT% lss %MAX_RETRIES% (
    curl -s http://localhost:4000/api/health >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo SUCCES: Server is bereikbaar!
        goto :server_check_done
    ) else (
        set /a RETRY_COUNT+=1
        echo INFO: Wachten op server ^(poging !RETRY_COUNT!/%MAX_RETRIES%^)...
        timeout /t 2 /nobreak >nul
        goto :server_check_loop
    )
)
:server_check_done

:: Ollama modellen controleren
echo INFO: Controleren of Ollama modellen beschikbaar zijn...
curl -s http://localhost:4000/api/ollama/models >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo SUCCES: Ollama modellen zijn beschikbaar!
    echo INFO: Beschikbare modellen:
    for /f "tokens=2 delims=:}" %%a in ('curl -s http://localhost:4000/api/ollama/models ^| findstr "name"') do (
        set model=%%a
        set model=!model:"=!
        set model=!model:,=!
        echo - !model!
    )
) else (
    echo WAARSCHUWING: Ollama modellen niet bereikbaar.
)

:: Even wachten om er zeker van te zijn dat services volledig gestart zijn
echo INFO: Laatste controles uitvoeren, even geduld... 
timeout /t 3 /nobreak >nul

:: Open de frontend in de browser
echo INFO: Frontend openen in browser...
start "" http://localhost:3001
timeout /t 2 /nobreak >nul

echo.
echo SUCCES: Applicatie is gestart!
echo ======================================================
echo Frontend: http://localhost:3001
echo Backend API: http://localhost:4000/api
echo Chat Interface: http://localhost:3001/chat
echo ======================================================
echo.
echo INFO: Gebruik 'docker-compose logs' om de logs te bekijken.
echo INFO: Gebruik 'docker-compose down' om de applicatie te stoppen.
echo.

pause 