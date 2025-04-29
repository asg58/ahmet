@echo off
title AI Design Agent - Minimal Starter
setlocal

echo ----------------------------------------------
echo        AI Design Agent - Minimal Starter
echo ----------------------------------------------

:: Docker containers opstarten
echo Docker containers opstarten...
docker-compose down
docker-compose up -d

:: Even wachten zodat services kunnen opstarten
echo Wachten op services (10 seconden)...
timeout /t 10 /nobreak > nul

:: Browser openen (beide methodes proberen)
echo Browser openen...
start http://localhost:3001
timeout /t 1 /nobreak > nul
explorer "http://localhost:3001"

echo.
echo Applicatie is gestart!
echo ----------------------------------------------
echo Frontend: http://localhost:3001
echo Backend API: http://localhost:4000/api
echo ----------------------------------------------

pause 