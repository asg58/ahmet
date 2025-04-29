@echo off
title AI Design Agent - Stop Script
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
echo │        AI Design Agent - Stop Script          │
echo │                                               │
echo └───────────────────────────────────────────────┘
echo %NC%

:: Check of Docker is geïnstalleerd
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%Docker is niet geïnstalleerd. Stop script kan niet worden uitgevoerd.%NC%
    pause
    exit /b 1
)

:: Controleer of containers actief zijn
echo %BLUE%Controleren van actieve containers...%NC%
for /f "tokens=*" %%a in ('docker ps --filter "name=ai-corelapp01" --format "{{.Names}}"') do (
    set "CONTAINERS=%%a"
)

if "!CONTAINERS!"=="" (
    echo %YELLOW%Geen actieve containers gevonden. Niets om te stoppen.%NC%
) else (
    echo %GREEN%Actieve containers gevonden. Deze worden nu gestopt...%NC%
    echo %YELLOW%Actieve containers:%NC%
    docker ps --filter "name=ai-corelapp01" --format "{{.Names}}"
    
    :: Docker containers stoppen
    echo %BLUE%Docker containers stoppen...%NC%
    docker-compose down
    
    :: Controleer of containers succesvol zijn gestopt
    for /f "tokens=*" %%a in ('docker ps --filter "name=ai-corelapp01" --format "{{.Names}}"') do (
        set "REMAINING=%%a"
    )
    
    if "!REMAINING!"=="" (
        echo %GREEN%Alle containers zijn succesvol gestopt.%NC%
    ) else (
        echo %RED%Er zijn nog steeds containers actief:%NC%
        docker ps --filter "name=ai-corelapp01" --format "{{.Names}}"
        echo %YELLOW%Probeer handmatig te stoppen met: docker-compose down --remove-orphans%NC%
    )
)

:: Optioneel: volumes opruimen
set /p CLEAN_VOLUMES="Wil je ook de persistent data (volumes) verwijderen? (y/n): "
if /i "%CLEAN_VOLUMES%"=="y" (
    echo %YELLOW%Data volumes worden verwijderd...%NC%
    docker-compose down -v
    echo %GREEN%Volumes zijn verwijderd.%NC%
)

echo.
echo %GREEN%✓ Cleanup voltooid!%NC%
echo %BLUE%===============================================%NC%
echo Je kunt de applicatie opnieuw starten met %YELLOW%start.bat%NC%
echo %BLUE%===============================================%NC%
echo.

pause 