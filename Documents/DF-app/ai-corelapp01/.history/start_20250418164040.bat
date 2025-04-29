@echo off
title AI Design Agent - Opstart Script
setlocal enabledelayedexpansion

:: Kleuren voor Windows console
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set BLUE=[94m
set NC=[0m

:: Banner weergeven
echo %BLUE%
echo ┌───────────────────────────────────────────────┐
echo │                                               │
echo │        AI Design Agent - Opstart Script       │
echo │                                               │
echo └───────────────────────────────────────────────┘
echo %NC%

:: Check of Docker is geïnstalleerd
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%Docker is niet geïnstalleerd. Installeer Docker om door te gaan.%NC%
    pause
    exit /b 1
)

:: Check of Ollama is geïnstalleerd (optioneel)
where ollama >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %YELLOW%Waarschuwing: Ollama is niet geïnstalleerd. Het wordt aanbevolen om Ollama te installeren.%NC%
    echo Download van: https://ollama.com/download
)

:: Controleer of .env bestanden bestaan, zo niet, maak ze aan
if not exist ".\server\.env" (
    echo %YELLOW%Server .env bestand niet gevonden. Aanmaken van default versie...%NC%
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
    echo %GREEN%Server .env aangemaakt.%NC%
)

if not exist ".\client\.env" (
    echo %YELLOW%Client .env bestand niet gevonden. Aanmaken van default versie...%NC%
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:4000
        echo NEXT_PUBLIC_WS_URL=ws://localhost:4000
    ) > .\client\.env
    echo %GREEN%Client .env aangemaakt.%NC%
)

:: Docker containers opstarten
echo %BLUE%Docker containers opstarten...%NC%
docker-compose down
docker-compose up -d

:: Wacht tot de services beschikbaar zijn
echo %YELLOW%Wachten tot services beschikbaar zijn...%NC%
timeout /t 5 /nobreak >nul

:: Test of de server bereikbaar is
echo %BLUE%Controleren of de server bereikbaar is...%NC%
set MAX_RETRIES=10
set RETRY_COUNT=0

:server_check_loop
if %RETRY_COUNT% lss %MAX_RETRIES% (
    curl -s http://localhost:4000/api/health >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo %GREEN%Server is bereikbaar!%NC%
        goto :server_check_done
    ) else (
        set /a RETRY_COUNT+=1
        if !RETRY_COUNT! equ %MAX_RETRIES% (
            echo %RED%Server niet bereikbaar na %MAX_RETRIES% pogingen.%NC%
        ) else (
            echo %YELLOW%Wachten op server (poging !RETRY_COUNT!/%MAX_RETRIES%)...%NC%
            timeout /t 3 /nobreak >nul
            goto :server_check_loop
        )
    )
)
:server_check_done

:: Ollama modellen controleren
echo %BLUE%Controleren of Ollama modellen beschikbaar zijn...%NC%
curl -s http://localhost:4000/api/ollama/models >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN%Ollama modellen zijn beschikbaar!%NC%
    echo %BLUE%Beschikbare modellen:%NC%
    for /f "tokens=2 delims=:}" %%a in ('curl -s http://localhost:4000/api/ollama/models ^| findstr "name"') do (
        set model=%%a
        set model=!model:"=!
        set model=!model:,=!
        echo - !model!
    )
) else (
    echo %RED%Ollama modellen niet bereikbaar.%NC%
)

:: Open de frontend in de browser
echo %BLUE%Frontend openen in browser...%NC%
start "" http://localhost:3001

echo.
echo %GREEN%✓ Applicatie is gestart!%NC%
echo %BLUE%===============================================%NC%
echo %YELLOW%Frontend:%NC% http://localhost:3001
echo %YELLOW%Backend API:%NC% http://localhost:4000/api
echo %YELLOW%Chat Interface:%NC% http://localhost:3001/chat
echo %BLUE%===============================================%NC%
echo.
echo Gebruik %YELLOW%docker-compose logs%NC% om de logs te bekijken.
echo Gebruik %YELLOW%docker-compose down%NC% om de applicatie te stoppen.
echo.

pause 