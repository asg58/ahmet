@echo off
echo Checking Ollama installation...

:: Check if Ollama is installed
where ollama > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ollama is not installed or not in PATH. 
    echo Please install Ollama from https://ollama.com/download
    pause
    exit /b 1
)

echo [SUCCESS] Ollama found in system.

:: Check if Mistral Small is already pulled
echo Checking for Mistral Small model...
ollama list | findstr "mistral-small:24b" > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Mistral Small model not found. Pulling model...
    ollama pull mistral-small:24b
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to pull Mistral Small model.
        pause
        exit /b 1
    )
    echo [SUCCESS] Mistral Small model installed successfully.
) else (
    echo [INFO] Mistral Small model is already installed.
)

echo.
echo Your system is now configured to use Mistral Small (24B).
echo.
echo Press any key to exit...
pause > nul 