#!/bin/sh
set -e

echo "Starting Ollama service with custom entrypoint..."

# Start Ollama
ollama serve &
OLLAMA_PID=$!

# Wacht tot Ollama klaar is
echo "Waiting for Ollama to be ready..."
sleep 10

# Voer het initialisatie script uit
echo "Running initialization script..."
/ollama-init.sh

# Houd het proces draaiend
echo "Keeping Ollama running in foreground..."
wait $OLLAMA_PID 