const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Directory om back-ups op te slaan
const BACKUP_DIR = './chat-backups';

// Zorg ervoor dat de back-up directory bestaat
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Back-up directory aangemaakt: ${BACKUP_DIR}`);
}

// Huidige datum en tijd voor bestandsnaam
const now = new Date();
const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
const backupFile = path.join(BACKUP_DIR, `chat-backup-${timestamp}.json`);

// Data structuur voor de chat back-up
const chatBackup = {
  timestamp: now.toISOString(),
  conversation: []
};

// Interface voor gebruikersinvoer
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Chat Backup Tool ===');
console.log('Voeg berichten toe aan de back-up. Type EXIT om te stoppen en op te slaan.');
console.log('Format: GEBRUIKER: [bericht] of AI: [bericht]');
console.log('-----------------------------');

// Functie om gebruikersinvoer te verwerken
function processInput() {
  rl.question('> ', (input) => {
    // Controleer of gebruiker wil stoppen
    if (input.trim().toUpperCase() === 'EXIT') {
      saveBackup();
      return;
    }
    
    // Analyseer invoer (verwacht format: "GEBRUIKER: tekst" of "AI: tekst")
    let role, content;
    
    if (input.startsWith('GEBRUIKER:')) {
      role = 'user';
      content = input.substring('GEBRUIKER:'.length).trim();
    } else if (input.startsWith('AI:')) {
      role = 'assistant';
      content = input.substring('AI:'.length).trim();
    } else {
      // Als format niet correct is, neem aan dat het een gebruikersbericht is
      role = 'user';
      content = input.trim();
    }
    
    // Voeg bericht toe aan back-up
    chatBackup.conversation.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Bericht toegevoegd als "${role}"`);
    
    // Vraag om volgende invoer
    processInput();
  });
}

// Functie om de back-up op te slaan
function saveBackup() {
  try {
    fs.writeFileSync(backupFile, JSON.stringify(chatBackup, null, 2), 'utf8');
    console.log(`\nChat back-up opgeslagen in: ${backupFile}`);
    console.log(`${chatBackup.conversation.length} berichten opgeslagen.`);
    rl.close();
  } catch (error) {
    console.error('Fout bij het opslaan van de back-up:', error.message);
    console.log('Probeer het nogmaals...');
    processInput();
  }
}

// Start het programma
processInput(); 