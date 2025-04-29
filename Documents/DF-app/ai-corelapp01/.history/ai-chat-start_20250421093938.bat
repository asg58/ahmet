@echo off
echo ==================================
echo     AI CHAT GEHEUGEN ACTIVATIE
echo ==================================
echo.
echo Dit script laadt automatisch het geheugen van eerdere chatgesprekken
echo zodat de AI assistent altijd weet waar jullie mee bezig zijn.
echo.
echo ==================================
echo.

REM Controleer of de map bestaat
if not exist "chat-memory" (
    echo Map chat-memory bestaat niet. We maken een nieuwe map aan...
    mkdir "chat-memory"
    echo Map aangemaakt. Dit is de eerste sessie.
    goto :done
)

REM Controleer of het geheugenbestand bestaat
if not exist "chat-memory\ongoing-conversation.json" (
    echo Geen bestaand chatgeheugen gevonden. Dit is de eerste sessie.
    goto :done
)

echo Geheugen gevonden! Bezig met inlezen van eerdere chatgesprekken...
echo.

node chat-memory-trigger.js auto-load

echo.
echo ==================================
echo.
echo Je kunt nu beginnen met chatten. De AI heeft het geheugen ingelezen
echo en weet waar jullie mee bezig waren.
echo.
echo Na afloop sluit je de chat af door het chatgeheugen op te slaan:
echo   node chat-memory-trigger.js save
echo.
echo ==================================

:done
echo.
echo Klaar voor gebruik. Druk op een toets om dit venster te sluiten...
pause > nul 