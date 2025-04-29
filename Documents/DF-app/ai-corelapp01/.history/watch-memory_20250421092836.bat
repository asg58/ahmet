@echo off
echo ==================================
echo    CHAT GEHEUGEN MONITOR
echo ==================================
echo.
echo Dit venster toont automatisch elke 30 seconden
echo de laatste stand van het chatgeheugen.
echo.
echo Zo kun je zien wat er in het geheugen staat
echo zonder het hoofdprogramma te verstoren.
echo.
echo (Druk Ctrl+C om af te sluiten)
echo.
echo ==================================
echo.

node show-memory.js --watch 