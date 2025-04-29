#!/bin/bash

# AI Design Agent - Opstart Script
# Dit script start de applicatie en voert de nodige initialisatie uit

# Kleuren voor output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner weergeven
echo -e "${BLUE}"
echo "┌───────────────────────────────────────────────┐"
echo "│                                               │"
echo "│        AI Design Agent - Opstart Script       │"
echo "│                                               │"
echo "└───────────────────────────────────────────────┘"
echo -e "${NC}"

# Check of Docker is geïnstalleerd
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is niet geïnstalleerd. Installeer Docker om door te gaan.${NC}"
    exit 1
fi

# Check of Ollama is geïnstalleerd
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Waarschuwing: Ollama is niet geïnstalleerd. Het wordt aanbevolen om Ollama te installeren.${NC}"
    echo "Download van: https://ollama.com/download"
fi

# Controleer of .env bestanden bestaan, zo niet, kopieer defaults
if [ ! -f "./server/.env" ]; then
    echo -e "${YELLOW}Server .env bestand niet gevonden. Aanmaken van default versie...${NC}"
    cat > ./server/.env << EOL
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3001
OLLAMA_HOST=ollama
OLLAMA_PORT=11435
CHROMA_HOST=chromadb
CHROMA_PORT=8001
CORELDRAW_HOST=localhost
CORELDRAW_PORT=4500
BLENDER_HOST=localhost
BLENDER_PORT=4600
LOG_LEVEL=debug
EOL
    echo -e "${GREEN}Server .env aangemaakt.${NC}"
fi

if [ ! -f "./client/.env" ]; then
    echo -e "${YELLOW}Client .env bestand niet gevonden. Aanmaken van default versie...${NC}"
    cat > ./client/.env << EOL
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
EOL
    echo -e "${GREEN}Client .env aangemaakt.${NC}"
fi

# Docker containers opstarten
echo -e "${BLUE}Docker containers opstarten...${NC}"
docker-compose down
docker-compose up -d

# Wacht tot de services beschikbaar zijn
echo -e "${YELLOW}Wachten tot services beschikbaar zijn...${NC}"
sleep 5

# Test of de server bereikbaar is
echo -e "${BLUE}Controleren of de server bereikbaar is...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:4000/api/health &> /dev/null; then
        echo -e "${GREEN}Server is bereikbaar!${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo -e "${RED}Server niet bereikbaar na $MAX_RETRIES pogingen.${NC}"
        else
            echo -e "${YELLOW}Wachten op server (poging $RETRY_COUNT/$MAX_RETRIES)...${NC}"
            sleep 3
        fi
    fi
done

# Ollama modellen controleren
echo -e "${BLUE}Controleren of Ollama modellen beschikbaar zijn...${NC}"
if curl -s http://localhost:4000/api/ollama/models &> /dev/null; then
    echo -e "${GREEN}Ollama modellen zijn beschikbaar!${NC}"
    echo -e "${BLUE}Beschikbare modellen:${NC}"
    curl -s http://localhost:4000/api/ollama/models | grep -o '"name":"[^"]*' | sed 's/"name":"/- /'
else
    echo -e "${RED}Ollama modellen niet bereikbaar.${NC}"
fi

# Open de frontend in de browser
echo -e "${BLUE}Frontend openen in browser...${NC}"
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3001
elif command -v open &> /dev/null; then
    open http://localhost:3001
elif command -v start &> /dev/null; then
    start http://localhost:3001
else
    echo -e "${YELLOW}Kon de browser niet automatisch openen. Open handmatig: http://localhost:3001${NC}"
fi

echo ""
echo -e "${GREEN}✓ Applicatie is gestart!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}Frontend:${NC} http://localhost:3001"
echo -e "${YELLOW}Backend API:${NC} http://localhost:4000/api"
echo -e "${YELLOW}Chat Interface:${NC} http://localhost:3001/chat"
echo -e "${BLUE}===============================================${NC}"
echo ""
echo -e "Gebruik ${YELLOW}docker-compose logs -f${NC} om de logs te bekijken."
echo -e "Gebruik ${YELLOW}docker-compose down${NC} om de applicatie te stoppen."
echo "" 