#!/bin/sh
set -e

echo "Initializing Ollama with required models..."

# Wacht om er zeker van te zijn dat Ollama draait
sleep 5

echo "Ollama service is available. Starting model downloads..."

# Probeer het model te downloaden
echo "Pulling Mistral Small 3.1..."
ollama pull mistral-small:3.1

# Controleer of download succesvol was
if [ $? -eq 0 ]; then
    echo "Successfully pulled Mistral Small 3.1"
else
    echo "Failed to pull Mistral Small 3.1. Trying to pull other models as fallback..."
    
    # Probeer Mistral 7B te downloaden als fallback
    echo "Pulling Mistral 7B as fallback..."
    ollama pull mistral
    
    if [ $? -eq 0 ]; then
        echo "Successfully pulled Mistral 7B"
    else
        # Probeer een derde optie
        echo "Failed to pull Mistral 7B. Trying Phi-3..."
        ollama pull phi3
        
        if [ $? -eq 0 ]; then
            echo "Successfully pulled Phi-3"
        else
            # Probeer een basis model dat waarschijnlijk wel beschikbaar is
            echo "Trying to pull basic llama3:8b model..."
            ollama pull llama3:8b
            
            if [ $? -eq 0 ]; then
                echo "Successfully pulled llama3:8b"
            else
                echo "Failed to pull any models. Will use default models if available."
            fi
        fi
    fi
fi

# Toon beschikbare modellen
echo "Available models:"
ollama list

echo "Ollama initialization complete." 