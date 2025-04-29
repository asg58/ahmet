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

:: Check of Python is geïnstalleerd voor Blender Bridge
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WAARSCHUWING: Python is niet geïnstalleerd. Het is nodig voor de Blender Bridge.
    echo Download van: https://www.python.org/downloads/
)

:: Check of Node.js is geïnstalleerd voor CorelDRAW Bridge
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WAARSCHUWING: Node.js is niet geïnstalleerd. Het is nodig voor de CorelDRAW Bridge.
    echo Download van: https://nodejs.org/
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

:: Controleer of het Blender Bridge .env bestand bestaat, zo niet, maak het aan
if not exist ".\integrations\blender\.env" (
    echo INFO: Blender Bridge .env bestand niet gevonden. Aanmaken van default versie...
    (
        echo # Server Configuration
        echo PORT=4201
        echo HOST=0.0.0.0
        echo # Blender Settings - pas dit aan naar het juiste pad van Blender op je systeem
        echo BLENDER_PATH=C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe
        echo # Logging
        echo LOG_LEVEL=INFO
        echo # Debug
        echo DEBUG=true
        echo # Mock Mode (false om echte Blender te gebruiken)
        echo MOCK_BLENDER=false
    ) > .\integrations\blender\.env
    echo INFO: Blender Bridge .env aangemaakt.
)

:: Controleer of het CorelDRAW Bridge .env bestand bestaat, zo niet, maak het aan
if not exist ".\integrations\coreldraw\.env" (
    echo INFO: CorelDRAW Bridge .env bestand niet gevonden. Aanmaken van default versie...
    (
        echo # Server configuratie
        echo PORT=4500
        echo WEBSOCKET_PORT=4501
        echo HOST=0.0.0.0
        echo # CorelDRAW configuratie
        echo CORELDRAW_VERSION=2021
        echo # Pad naar het CorelDRAW uitvoerbare bestand
        echo CORELDRAW_PATH=C:\Program Files\Corel\CorelDRAW Graphics Suite 2021\Programs\CorelDRW.exe
        echo # Voor ontwikkeling zonder CorelDRAW installatie
        echo MOCK_CORELDRAW=true
        echo # Logging
        echo LOG_LEVEL=info
    ) > .\integrations\coreldraw\.env
    echo INFO: CorelDRAW Bridge .env aangemaakt.
)

:: Stop eventuele processen die de Blender Bridge poorten blokkeren
echo INFO: Vrijmaken van poorten voor de Blender Bridge...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4201"') do (
    echo INFO: Proces op poort 4201 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4202"') do (
    echo INFO: Proces op poort 4202 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV /NH ^| findstr "server.py"') do (
    for /f "tokens=2 delims=," %%b in ("%%a") do (
        echo INFO: Python-proces voor server.py gevonden (PID: %%b), proces wordt gestopt...
        taskkill /F /PID %%b >nul 2>nul
    )
)

:: Stop eventuele processen die de CorelDRAW Bridge poorten blokkeren
echo INFO: Vrijmaken van poorten voor de CorelDRAW Bridge...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4500"') do (
    echo INFO: Proces op poort 4500 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4501"') do (
    echo INFO: Proces op poort 4501 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH ^| findstr "index.js\|index.ts"') do (
    for /f "tokens=2 delims=," %%b in ("%%a") do (
        echo INFO: Node-proces voor CorelDRAW Bridge gevonden (PID: %%b), proces wordt gestopt...
        taskkill /F /PID %%b >nul 2>nul
    )
)

:: Docker containers opstarten
echo INFO: Docker containers opstarten...
docker-compose down
docker-compose up -d

:: Bouw de CorelDRAW Bridge indien nodig
echo INFO: CorelDRAW Bridge voorbereiden...
if not exist ".\integrations\coreldraw\node_modules" (
    echo INFO: Installeren van CorelDRAW Bridge dependencies...
    cd integrations\coreldraw
    call npm install
    cd ..\..
)

:: Start Blender Bridge in een apart process
echo INFO: Blender Bridge service starten...
start "Blender Bridge" cmd /c "cd integrations\blender\app && python server.py"

:: Start CorelDRAW Bridge in een apart process
echo INFO: CorelDRAW Bridge service starten...
start "CorelDRAW Bridge" cmd /c "cd integrations\coreldraw && npm run dev"

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

:: Test of de Blender Bridge bereikbaar is
echo INFO: Controleren of de Blender Bridge bereikbaar is...
set MAX_RETRIES=10
set RETRY_COUNT=0

:blender_bridge_check_loop
if %RETRY_COUNT% lss %MAX_RETRIES% (
    curl -s http://localhost:4201/health >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo SUCCES: Blender Bridge is bereikbaar!
        goto :blender_bridge_check_done
    ) else (
        set /a RETRY_COUNT+=1
        echo INFO: Wachten op Blender Bridge ^(poging !RETRY_COUNT!/%MAX_RETRIES%^)...
        timeout /t 2 /nobreak >nul
        goto :blender_bridge_check_loop
    )
)
echo WAARSCHUWING: Blender Bridge is niet bereikbaar na %MAX_RETRIES% pogingen.
:blender_bridge_check_done

:: Test of de CorelDRAW Bridge bereikbaar is
echo INFO: Controleren of de CorelDRAW Bridge bereikbaar is...
set MAX_RETRIES=10
set RETRY_COUNT=0

:coreldraw_bridge_check_loop
if %RETRY_COUNT% lss %MAX_RETRIES% (
    curl -s http://localhost:4500/health >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo SUCCES: CorelDRAW Bridge is bereikbaar!
        goto :coreldraw_bridge_check_done
    ) else (
        set /a RETRY_COUNT+=1
        echo INFO: Wachten op CorelDRAW Bridge ^(poging !RETRY_COUNT!/%MAX_RETRIES%^)...
        timeout /t 2 /nobreak >nul
        goto :coreldraw_bridge_check_loop
    )
)
echo WAARSCHUWING: CorelDRAW Bridge is niet bereikbaar na %MAX_RETRIES% pogingen.
:coreldraw_bridge_check_done

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
echo Blender Bridge: http://localhost:4201
echo CorelDRAW Bridge: http://localhost:4500
echo Chat Interface: http://localhost:3001/chat
echo ======================================================
echo.
echo INFO: Gebruik 'docker-compose logs' om de logs te bekijken.
echo.
echo BEDIENING:
echo 1. Druk op [S] om de applicatie te stoppen
echo 2. Druk op een andere toets om dit venster te sluiten maar de applicatie te laten draaien
echo.

:: Keuzemenu voor afsluiten
choice /C SQ /N /M "Druk [S] om de applicatie te stoppen, of [Q] om alleen dit venster te sluiten: "
if %ERRORLEVEL% equ 1 (
    call :shutdown
) else (
    exit /b 0
)

goto :eof

:: Functie voor het netjes afsluiten van de applicatie
:shutdown
echo.
echo INFO: Applicatie wordt afgesloten...

:: Stop eerst de Blender Bridge processen
echo INFO: Blender Bridge processen stoppen...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4201"') do (
    echo INFO: Proces op poort 4201 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4202"') do (
    echo INFO: Proces op poort 4202 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV /NH ^| findstr "server.py"') do (
    for /f "tokens=2 delims=," %%b in ("%%a") do (
        echo INFO: Python-proces voor server.py gevonden (PID: %%b), proces wordt gestopt...
        taskkill /F /PID %%b >nul 2>nul
    )
)

:: Stop alle Blender processen die zijn gestart
echo INFO: Blender processen stoppen...
for /f %%a in ('tasklist /FI "IMAGENAME eq blender.exe" /FO CSV /NH') do (
    for /f "tokens=2 delims=," %%b in ("%%a") do (
        echo INFO: Blender-proces gevonden (PID: %%b), proces wordt gestopt...
        taskkill /F /PID %%b >nul 2>nul
    )
)

:: Stop de CorelDRAW Bridge processen
echo INFO: CorelDRAW Bridge processen stoppen...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4500"') do (
    echo INFO: Proces op poort 4500 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:4501"') do (
    echo INFO: Proces op poort 4501 gevonden (PID: %%a), proces wordt gestopt...
    taskkill /F /PID %%a >nul 2>nul
)
for /f %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH ^| findstr "index.js\|index.ts"') do (
    for /f "tokens=2 delims=," %%b in ("%%a") do (
        echo INFO: Node-proces voor CorelDRAW Bridge gevonden (PID: %%b), proces wordt gestopt...
        taskkill /F /PID %%b >nul 2>nul
    )
)

:: Stop alle CorelDRAW processen die zijn gestart
echo INFO: CorelDRAW processen stoppen...
for /f %%a in ('tasklist /FI "IMAGENAME eq CorelDRW.exe" /FO CSV /NH') do (
    for /f "tokens=2 delims=," %%b in ("%%a") do (
        echo INFO: CorelDRAW-proces gevonden (PID: %%b), proces wordt gestopt...
        taskkill /F /PID %%b >nul 2>nul
    )
)

:: Stop Docker containers
echo INFO: Docker containers stoppen...
docker-compose down

echo.
echo SUCCES: Alle processen zijn succesvol afgesloten.
echo.
pause
exit /b 0 