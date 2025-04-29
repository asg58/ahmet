@echo off
title AI Design Agent - Complete App Startup
setlocal enabledelayedexpansion

echo ======================================================
echo             AI Design Agent - Complete Startup       
echo ======================================================
echo.

:: Step 1: Stop any existing processes
echo [1/7] Stopping existing processes...
powershell -Command "Get-NetTCPConnection -LocalPort 4201,4202,4500,4501,4000,4001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: Step 2: Stop any existing Docker containers
echo [2/7] Stopping existing Docker containers...
docker-compose down
timeout /t 2 /nobreak >nul

:: Step 3: Build server application (if needed)
echo [3/7] Building server application...
if not exist ".\server\dist" (
    cd server
    call npm install
    call npm run build
    cd ..
    echo     Server built successfully.
) else (
    echo     Server already built, skipping.
)

:: Step 4: Start Docker containers
echo [4/7] Starting Docker containers (chromadb and ollama)...
docker-compose up -d chromadb ollama
timeout /t 5 /nobreak >nul

:: Step 5: Start Blender bridge service
echo [5/7] Starting Blender bridge service...
cd integrations\blender\app
start "Blender Bridge" cmd /c "python server.py --no-debug"
cd ..\..\..
timeout /t 3 /nobreak >nul

:: Step 6: Check if Blender bridge is responsive
echo [6/7] Checking if Blender bridge is responsive...
set MAX_RETRIES=15
set RETRY_COUNT=0

:blender_bridge_check_loop
if !RETRY_COUNT! lss !MAX_RETRIES! (
    curl -s http://localhost:4201/health >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo     SUCCESS: Blender Bridge is accessible!
        goto :blender_bridge_check_done
    ) else (
        set /a RETRY_COUNT=!RETRY_COUNT!+1
        echo     Waiting for Blender Bridge to start (attempt !RETRY_COUNT!/!MAX_RETRIES!)...
        timeout /t 2 /nobreak >nul
        goto :blender_bridge_check_loop
    )
)
echo     WARNING: Blender Bridge did not respond after !MAX_RETRIES! attempts.
:blender_bridge_check_done

:: Start the server in dev mode
echo [7/7] Starting the server...
cd server
start "Server" cmd /c "npm run dev"
cd ..

:: Test WebSocket connection using our test script
echo Testing WebSocket connection...
node test-websocket.js

:: Done
echo.
echo ======================================================
echo All services started!
echo.
echo Endpoints:
echo - Server API: http://localhost:4000
echo - Blender Bridge: http://localhost:4201
echo - Blender WebSocket: ws://localhost:4202
echo ======================================================
echo.
echo Press any key to exit this window (services will continue running)
pause > nul 