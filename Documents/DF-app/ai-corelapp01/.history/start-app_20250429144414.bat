@echo off
echo ====================================
echo AI CorelDRAW App Startup Script
echo ====================================
echo.

echo Stopping any existing containers...
docker-compose down
echo.

echo Starting basic services (ChromaDB and Ollama)...
docker-compose up -d chromadb ollama
echo Waiting 15 seconds for services to initialize...
timeout /t 15 /nobreak > nul
echo.

echo Starting Blender Bridge...
docker-compose up -d blender-bridge
echo Waiting 10 seconds for Blender Bridge to initialize...
timeout /t 10 /nobreak > nul
echo.

echo Starting CorelDRAW Bridge...
docker-compose up -d coreldraw-bridge
echo Waiting 10 seconds for CorelDRAW Bridge to initialize...
timeout /t 10 /nobreak > nul
echo.

echo Starting main server...
docker-compose up -d server
echo Waiting 15 seconds for server to initialize...
timeout /t 15 /nobreak > nul
echo.

echo Starting client frontend...
docker-compose up -d client
echo Waiting 15 seconds for client to initialize...
timeout /t 15 /nobreak > nul
echo.

echo Checking service statuses...
docker-compose ps
echo.

echo Testing server health endpoint...
curl http://localhost:4000/api/health
echo.

echo ====================================
echo AI CorelDRAW App heeft succesvol opgestart
echo ====================================
echo.
echo Toegangspunten:
echo - Web Interface: http://localhost:3001
echo - API: http://localhost:4000/api
echo - API Documentatie: http://localhost:4000/api/docs
echo - Blender Bridge: http://localhost:4201
echo - CorelDRAW Bridge: http://localhost:5000
echo.
echo Alle logs bekijken: docker-compose logs -f
echo Server logs bekijken: docker-compose logs -f server
echo Client logs bekijken: docker-compose logs -f client
echo.

echo Opening web interface in browser...
start http://localhost:3001 