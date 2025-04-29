FROM node:18-slim

WORKDIR /app

# Installeer systeemafhankelijkheden
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Kopieer package.json bestanden
COPY package*.json ./

# Installeer alle dependencies inclusief dev dependencies voor het bouwen
RUN npm install

# Kopieer broncode en configuratie
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript naar JavaScript
RUN npm run build

# Maak log directory
RUN mkdir -p logs

# Expose API port
EXPOSE 3001
EXPOSE 3002

# Stel omgevingsvariabelen in
ENV PORT=3001
ENV WEBSOCKET_PORT=3002
ENV HOST=0.0.0.0
ENV MOCK_CORELDRAW=true
ENV LOG_LEVEL=info
ENV DEBUG=false

# Start de applicatie
CMD ["node", "dist/index.js"] 