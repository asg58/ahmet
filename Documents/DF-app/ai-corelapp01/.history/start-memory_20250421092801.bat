@echo off
echo ==================================
echo     CHAT GEHEUGEN SYSTEEM
echo ==================================
echo.
echo Dit systeem houdt al je chatgesprekken bij en zorgt
echo ervoor dat de AI altijd weet waar jullie over praten,
echo zelfs nadat je de chat hebt afgesloten.
echo.
echo Het slaat automatisch elke minuut op en maakt backups.
echo.
echo ==================================
echo.

if not exist node_modules\readline (
    echo Node.js modules installeren...
    npm install
)

echo Chatgeheugen starten...
echo (Laat dit venster open staan terwijl je chat)
echo.
echo Commando's:
echo   USER: [tekst]     - Voeg gebruikersbericht toe
echo   AI: [tekst]       - Voeg AI bericht toe
echo   SHOW              - Toon huidige conversatie
echo   BACKUP            - Maak handmatig een backup
echo   EXIT              - Sluit het programma
echo.
echo ==================================
echo.

node auto-chat-memory.js

pause 