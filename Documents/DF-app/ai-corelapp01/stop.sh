#!/bin/bash

# AI Design Agent - Stop Script
# Dit script stopt alle containers en geeft status updates

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
echo "│        AI Design Agent - Stop Script          │"
echo "│                                               │"
echo "└───────────────────────────────────────────────┘"
echo -e "${NC}"

# Check of Docker is geïnstalleerd
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is niet geïnstalleerd. Stop script kan niet worden uitgevoerd.${NC}"
    exit 1
fi

# Controleer of containers actief zijn
echo -e "${BLUE}Controleren van actieve containers...${NC}"
CONTAINERS=$(docker ps --filter "name=ai-corelapp01" --format "{{.Names}}")

if [ -z "$CONTAINERS" ]; then
    echo -e "${YELLOW}Geen actieve containers gevonden. Niets om te stoppen.${NC}"
else
    echo -e "${GREEN}Actieve containers gevonden. Deze worden nu gestopt...${NC}"
    echo -e "${YELLOW}Actieve containers:${NC}"
    echo "$CONTAINERS"
    
    # Docker containers stoppen
    echo -e "${BLUE}Docker containers stoppen...${NC}"
    docker-compose down
    
    # Controleer of containers succesvol zijn gestopt
    REMAINING=$(docker ps --filter "name=ai-corelapp01" --format "{{.Names}}")
    if [ -z "$REMAINING" ]; then
        echo -e "${GREEN}Alle containers zijn succesvol gestopt.${NC}"
    else
        echo -e "${RED}Er zijn nog steeds containers actief:${NC}"
        echo "$REMAINING"
        echo -e "${YELLOW}Probeer handmatig te stoppen met: docker-compose down --remove-orphans${NC}"
    fi
fi

# Optioneel: volumes opruimen
read -p "Wil je ook de persistent data (volumes) verwijderen? (y/n): " CLEAN_VOLUMES
if [[ $CLEAN_VOLUMES == "y" || $CLEAN_VOLUMES == "Y" ]]; then
    echo -e "${YELLOW}Data volumes worden verwijderd...${NC}"
    docker-compose down -v
    echo -e "${GREEN}Volumes zijn verwijderd.${NC}"
fi

echo ""
echo -e "${GREEN}✓ Cleanup voltooid!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "Je kunt de applicatie opnieuw starten met ${YELLOW}./start.sh${NC}"
echo -e "${BLUE}===============================================${NC}"
echo "" 