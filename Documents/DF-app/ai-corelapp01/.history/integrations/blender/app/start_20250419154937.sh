#!/bin/bash

# Maak logs directory
mkdir -p logs

# Laad omgevingsvariabelen als ze bestaan
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Start de server
echo "Starting Blender Bridge service..."
python server.py 