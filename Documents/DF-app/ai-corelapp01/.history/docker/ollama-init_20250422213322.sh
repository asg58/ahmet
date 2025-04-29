#!/bin/bash
set -e

echo "Initializing Ollama with required models..."

# Wait for Ollama to be ready
MAX_RETRIES=10
RETRY_COUNTER=0
until curl -s http://localhost:11434/api/tags > /dev/null || [ $RETRY_COUNTER -eq $MAX_RETRIES ]; do
    echo "Waiting for Ollama service to be available... (Attempt $RETRY_COUNTER of $MAX_RETRIES)"
    RETRY_COUNTER=$((RETRY_COUNTER+1))
    sleep 5
done

if [ $RETRY_COUNTER -eq $MAX_RETRIES ]; then
    echo "Failed to connect to Ollama after $MAX_RETRIES attempts. Exiting."
    exit 1
fi

echo "Ollama service is available. Starting model downloads..."

# Pull the Mistral Small 3.1 model
echo "Pulling Mistral Small 3.1..."
ollama pull mistral-small:3.1

# Check if pull was successful
if [ $? -eq 0 ]; then
    echo "Successfully pulled Mistral Small 3.1"
else
    echo "Failed to pull Mistral Small 3.1. Trying to pull other models as fallback..."
    
    # Try to pull Mistral 7B as fallback
    echo "Pulling Mistral 7B as fallback..."
    ollama pull mistral
    
    if [ $? -eq 0 ]; then
        echo "Successfully pulled Mistral 7B"
    else
        echo "Failed to pull Mistral 7B. Will use default models available in Ollama."
    fi
fi

# List available models
echo "Available models:"
ollama list

echo "Ollama initialization complete." 