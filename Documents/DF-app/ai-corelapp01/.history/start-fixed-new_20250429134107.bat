@echo off
echo Stopping all running Docker containers...
docker-compose down

echo Removing obsolete containers (if any)...
docker container prune -f

echo Starting services with fixed configuration...
docker-compose up -d

echo Checking service status...
timeout /t 10
docker-compose ps

echo Checking Blender bridge health...
curl -s http://localhost:4201/health

echo Checking server health...
curl -s http://localhost:4000/api/health

echo Done! Services should now be running correctly.
echo If you still experience issues, check the logs with: docker-compose logs -f server

pause 