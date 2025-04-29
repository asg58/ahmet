@echo off
echo ==================================
echo     AI CHAT GEHEUGEN OPSLAAN
echo ==================================
echo.
echo Dit script slaat de huidige chat op in het geheugen
echo zodat de AI deze conversatie onthoudt voor later.
echo.
echo ==================================
echo.

node chat-memory-trigger.js save

echo.
echo ==================================
echo.
echo Je chat is succesvol opgeslagen in het geheugen.
echo Je kunt nu veilig deze chat afsluiten.
echo.
echo Bij je volgende chat, voer uit:
echo   ai-chat-start.bat
echo om het geheugen weer in te laden.
echo.
echo ==================================
echo.
echo Druk op een toets om dit venster te sluiten...
pause > nul 