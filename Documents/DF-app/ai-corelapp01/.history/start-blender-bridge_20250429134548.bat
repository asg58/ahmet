@echo off
echo Starting Blender Bridge service...

:: Kill any existing process that might be using port 4201 or 4202
powershell -Command "Get-NetTCPConnection -LocalPort 4201 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
powershell -Command "Get-NetTCPConnection -LocalPort 4202 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: Change to the Blender Bridge directory and start the server
cd integrations\blender\app
python server.py

echo Blender Bridge service started. 