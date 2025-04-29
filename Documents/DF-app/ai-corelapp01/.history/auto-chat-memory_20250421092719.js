const fs = require('fs');
const path = require('path');

// Directory voor het bijhouden van de chat geschiedenis
const MEMORY_DIR = './chat-memory';
const MEMORY_FILE = path.join(MEMORY_DIR, 'ongoing-conversation.json');

// Zorg ervoor dat de directory bestaat
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  console.log(`Chat geheugen directory aangemaakt: ${MEMORY_DIR}`);
}

// Structuur voor het chatgeheugen
let chatMemory = {
  lastUpdated: new Date().toISOString(),
  messages: [],
  metadata: {
    sessionStarted: new Date().toISOString(),
    refreshCount: 0
  }
};

// Laad bestaand geheugen als het bestaat
function loadChatMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      const loadedMemory = JSON.parse(data);
      
      // Controleer of de geladen data geldige structuur heeft
      if (loadedMemory && Array.isArray(loadedMemory.messages)) {
        chatMemory = loadedMemory;
        chatMemory.metadata.refreshCount++;
        console.log(`Chatgeheugen geladen: ${chatMemory.messages.length} berichten`);
      }
    } else {
      console.log('Geen bestaand chatgeheugen gevonden, nieuw geheugen gestart');
    }
  } catch (error) {
    console.error('Fout bij het laden van chatgeheugen:', error.message);
    // Als er een fout is, behouden we het huidige geheugen
  }
}

// Sla het chatgeheugen op
function saveChatMemory() {
  try {
    chatMemory.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(chatMemory, null, 2), 'utf8');
    console.log(`Chatgeheugen opgeslagen: ${chatMemory.messages.length} berichten totaal`);
  } catch (error) {
    console.error('Fout bij het opslaan van chatgeheugen:', error.message);
  }
}

// Maak een backup van het chatgeheugen
function createBackup() {
  try {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
    const backupFile = path.join(MEMORY_DIR, `backup-${timestamp}.json`);
    
    fs.copyFileSync(MEMORY_FILE, backupFile);
    console.log(`Backup aangemaakt: ${backupFile}`);
    
    // Houd maximaal 10 backups bij
    cleanupOldBackups();
  } catch (error) {
    console.error('Fout bij het maken van backup:', error.message);
  }
}

// Verwijder oude backups (houd maximaal 10)
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(MEMORY_DIR);
    const backups = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
    
    if (backups.length > 10) {
      // Sorteer op datum (oudste eerst)
      backups.sort();
      
      // Verwijder de oudste backups
      for (let i = 0; i < backups.length - 10; i++) {
        fs.unlinkSync(path.join(MEMORY_DIR, backups[i]));
        console.log(`Oude backup verwijderd: ${backups[i]}`);
      }
    }
  } catch (error) {
    console.error('Fout bij het opruimen van oude backups:', error.message);
  }
}

// Voeg een nieuw bericht toe aan het geheugen
function addMessage(role, content) {
  chatMemory.messages.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
  
  saveChatMemory();
  console.log(`Nieuw ${role} bericht toegevoegd en opgeslagen`);
}

// Functie om de huidige conversatie te tonen (als hulpmiddel)
function showCurrentConversation() {
  console.log('\n=== Huidige Conversatie ===');
  console.log(`Totaal ${chatMemory.messages.length} berichten`);
  console.log(`Sessie gestart: ${chatMemory.metadata.sessionStarted}`);
  console.log(`Laatste update: ${chatMemory.lastUpdated}`);
  console.log('----------------------------');
  
  chatMemory.messages.forEach((msg, index) => {
    const shortContent = msg.content.length > 50 
      ? msg.content.substring(0, 47) + '...' 
      : msg.content;
    console.log(`${index + 1}. ${msg.role.toUpperCase()}: ${shortContent}`);
  });
  
  console.log('============================\n');
}

// Start het automatische proces
function startAutomaticMemory() {
  // Laad bestaand geheugen bij opstart
  loadChatMemory();
  
  // Toon het huidige geheugen bij opstart
  showCurrentConversation();
  
  // Verwerk opdrachten van de console
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('=== Automatisch Chat Geheugen ===');
  console.log('Commando\'s:');
  console.log('  USER: [tekst]       - Voeg een gebruikersbericht toe');
  console.log('  AI: [tekst]         - Voeg een AI-bericht toe');
  console.log('  SHOW                - Toon de huidige conversatie');
  console.log('  BACKUP              - Maak handmatig een backup');
  console.log('  EXIT                - Sluit het programma');
  console.log('----------------------------------');
  
  // Herlaad het geheugen elke minuut
  const memoryInterval = setInterval(() => {
    loadChatMemory();
    
    // Maak elke 10 minuten een backup (elke 10 refreshes)
    if (chatMemory.metadata.refreshCount % 10 === 0) {
      createBackup();
    }
  }, 60000); // 60000 ms = 1 minuut
  
  // Functie om commando's te verwerken
  function processCommand() {
    rl.question('> ', (input) => {
      const trimmedInput = input.trim();
      
      // Controleer commando's
      if (trimmedInput.toUpperCase() === 'EXIT') {
        saveChatMemory();
        createBackup();
        clearInterval(memoryInterval);
        rl.close();
        console.log('Programma beëindigd. Chatgeheugen opgeslagen.');
        return;
      } else if (trimmedInput.toUpperCase() === 'SHOW') {
        showCurrentConversation();
      } else if (trimmedInput.toUpperCase() === 'BACKUP') {
        createBackup();
      } else if (trimmedInput.startsWith('USER:')) {
        const content = trimmedInput.substring(5).trim();
        addMessage('user', content);
      } else if (trimmedInput.startsWith('AI:')) {
        const content = trimmedInput.substring(3).trim();
        addMessage('assistant', content);
      } else {
        // Standaard als gebruikersbericht behandelen
        addMessage('user', trimmedInput);
      }
      
      processCommand();
    });
  }
  
  // Start de commandoverwerking
  processCommand();
}

// Begin met het automatisch bijhouden van het geheugen
startAutomaticMemory(); 