# AI Design Agent - PowerShell Opstart Script

Write-Host "======================================================"
Write-Host "         AI Design Agent - PowerShell Starter         " -ForegroundColor Cyan
Write-Host "======================================================"
Write-Host ""

# Docker check
try {
    docker --version | Out-Null
    Write-Host "INFO: Docker is geïnstalleerd." -ForegroundColor Green
} catch {
    Write-Host "FOUT: Docker is niet geïnstalleerd. Installeer Docker om door te gaan." -ForegroundColor Red
    Read-Host "Druk op Enter om af te sluiten"
    exit
}

# Ollama check (optioneel)
try {
    ollama --version | Out-Null
    Write-Host "INFO: Ollama is geïnstalleerd." -ForegroundColor Green
} catch {
    Write-Host "WAARSCHUWING: Ollama is niet geïnstalleerd. Het wordt aanbevolen om Ollama te installeren." -ForegroundColor Yellow
    Write-Host "Download van: https://ollama.com/download"
}

# .env bestanden controleren
if (-not (Test-Path ".\server\.env")) {
    Write-Host "INFO: Server .env bestand niet gevonden. Aanmaken van default versie..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath ".\server\.env" -Encoding utf8
    Write-Host "INFO: Server .env aangemaakt." -ForegroundColor Green
}

if (-not (Test-Path ".\client\.env")) {
    Write-Host "INFO: Client .env bestand niet gevonden. Aanmaken van default versie..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
"@ | Out-File -FilePath ".\client\.env" -Encoding utf8
    Write-Host "INFO: Client .env aangemaakt." -ForegroundColor Green
}

# Docker containers opstarten
Write-Host "INFO: Docker containers opstarten..." -ForegroundColor Cyan
docker-compose down
docker-compose up -d

# Wachten tot services beschikbaar zijn
Write-Host "INFO: Wachten tot services beschikbaar zijn (10 seconden)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Server bereikbaarheid controleren
Write-Host "INFO: Controleren of de server bereikbaar is..." -ForegroundColor Cyan
$maxRetries = 15
$retryCount = 0
$serverUp = $false

while ($retryCount -lt $maxRetries -and -not $serverUp) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCES: Server is bereikbaar!" -ForegroundColor Green
            $serverUp = $true
        }
    } catch {
        $retryCount++
        if ($retryCount -eq $maxRetries) {
            Write-Host "WAARSCHUWING: Server niet bereikbaar na $maxRetries pogingen." -ForegroundColor Yellow
        } else {
            Write-Host "INFO: Wachten op server (poging $retryCount/$maxRetries)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

# Ollama modellen controleren
Write-Host "INFO: Controleren of Ollama modellen beschikbaar zijn..." -ForegroundColor Cyan
try {
    $models = Invoke-RestMethod -Uri "http://localhost:4000/api/ollama/models" -ErrorAction SilentlyContinue
    Write-Host "SUCCES: Ollama modellen zijn beschikbaar!" -ForegroundColor Green
    Write-Host "INFO: Beschikbare modellen:"
    foreach ($model in $models) {
        Write-Host "- $($model.name)"
    }
} catch {
    Write-Host "WAARSCHUWING: Ollama modellen niet bereikbaar." -ForegroundColor Yellow
}

# Wacht even om zeker te zijn dat alles gereed is
Write-Host "INFO: Laatste controles uitvoeren..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Open de browser
Write-Host "INFO: Browser openen..." -ForegroundColor Cyan
Start-Process "http://localhost:3001"

Write-Host ""
Write-Host "SUCCES: Applicatie is volledig gestart!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3001"
Write-Host "Backend API: http://localhost:4000/api" 
Write-Host "Chat Interface: http://localhost:3001/chat"
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INFO: Gebruik 'docker-compose logs' om de logs te bekijken." -ForegroundColor Cyan
Write-Host "INFO: Gebruik 'docker-compose down' om de applicatie te stoppen." -ForegroundColor Cyan
Write-Host ""

Read-Host "Druk op Enter om dit venster te sluiten" 