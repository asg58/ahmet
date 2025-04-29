#!/bin/sh
set -e

echo "Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wacht tot Ollama klaar is voor inkomende verbindingen
echo "Waiting for Ollama to be ready..."
MAX_RETRIES=30
RETRY_COUNTER=0
until curl -s http://localhost:11434/api/tags > /dev/null || [ $RETRY_COUNTER -eq $MAX_RETRIES ]; do
    echo "Waiting for Ollama service to be available... (Attempt $RETRY_COUNTER of $MAX_RETRIES)"
    RETRY_COUNTER=$((RETRY_COUNTER+1))
    sleep 2
done

if [ $RETRY_COUNTER -eq $MAX_RETRIES ]; then
    echo "Failed to connect to Ollama after $MAX_RETRIES attempts. Exiting."
    kill $OLLAMA_PID
    exit 1
fi

echo "Ollama service is running. Executing initialization script..."
/ollama-init.sh

echo "Initialization complete. Keeping Ollama running..."
wait $OLLAMA_PID 