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
    refreshCount: 0,
    aiTriggeredSaves: 0,
    aiTriggeredReads: 0
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
        return true;
      }
    } else {
      console.log('Geen bestaand chatgeheugen gevonden, nieuw geheugen gestart');
    }
    return false;
  } catch (error) {
    console.error('Fout bij het laden van chatgeheugen:', error.message);
    // Als er een fout is, behouden we het huidige geheugen
    return false;
  }
}

// Sla het chatgeheugen op
function saveChatMemory(aiTriggered = false) {
  try {
    chatMemory.lastUpdated = new Date().toISOString();
    
    if (aiTriggered) {
      chatMemory.metadata.aiTriggeredSaves++;
    }
    
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(chatMemory, null, 2), 'utf8');
    
    const trigger = aiTriggered ? 'AI-getriggerde ' : '';
    console.log(`${trigger}Chatgeheugen opgeslagen: ${chatMemory.messages.length} berichten totaal`);
    return true;
  } catch (error) {
    console.error('Fout bij het opslaan van chatgeheugen:', error.message);
    return false;
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
    return true;
  } catch (error) {
    console.error('Fout bij het maken van backup:', error.message);
    return false;
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
    return true;
  } catch (error) {
    console.error('Fout bij het opruimen van oude backups:', error.message);
    return false;
  }
}

// Voeg een nieuw bericht toe aan het geheugen
function addMessage(role, content, saveImmediately = false) {
  chatMemory.messages.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
  
  if (saveImmediately) {
    saveChatMemory(role === 'assistant');
  }
  
  console.log(`Nieuw ${role} bericht toegevoegd${saveImmediately ? ' en opgeslagen' : ''}`);
  return true;
}

// Functie om de huidige conversatie te tonen (als hulpmiddel)
function showCurrentConversation() {
  console.log('\n=== Huidige Conversatie ===');
  console.log(`Totaal ${chatMemory.messages.length} berichten`);
  console.log(`Sessie gestart: ${chatMemory.metadata.sessionStarted}`);
  console.log(`Laatste update: ${chatMemory.lastUpdated}`);
  console.log(`AI-getriggerde opslagen: ${chatMemory.metadata.aiTriggeredSaves}`);
  console.log(`AI-getriggerde herladingen: ${chatMemory.metadata.aiTriggeredReads}`);
  console.log('----------------------------');
  
  const messagesToShow = chatMemory.messages.length > 15 ? 
    chatMemory.messages.slice(-15) : chatMemory.messages;
    
  if (chatMemory.messages.length > 15) {
    console.log(`[...${chatMemory.messages.length - 15} eerdere berichten weggelaten...]`);
  }
  
  messagesToShow.forEach((msg, index) => {
    const actualIndex = chatMemory.messages.length - messagesToShow.length + index + 1;
    const shortContent = msg.content.length > 50 
      ? msg.content.substring(0, 47) + '...' 
      : msg.content;
    console.log(`${actualIndex}. ${msg.role.toUpperCase()}: ${shortContent}`);
  });
  
  console.log('============================\n');
  return true;
}

// AI-getriggerde functionaliteit om geheugen te herladen
function aiTriggeredLoad() {
  chatMemory.metadata.aiTriggeredReads++;
  console.log('AI heeft een geheugen-herlaadactie getriggerd!');
  return loadChatMemory();
}

// AI-getriggerde functionaliteit om geheugen op te slaan
function aiTriggeredSave() {
  console.log('AI heeft een geheugen-opslagactie getriggerd!');
  return saveChatMemory(true);
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
  
  console.log('=== Dynamisch Chat Geheugen ===');
  console.log('Commando\'s:');
  console.log('  USER: [tekst]       - Voeg een gebruikersbericht toe');
  console.log('  AI: [tekst]         - Voeg een AI-bericht toe');
  console.log('  AI-SAVE             - AI triggert een opslag-actie');
  console.log('  AI-LOAD             - AI triggert een herlaad-actie');
  console.log('  SHOW                - Toon de huidige conversatie');
  console.log('  BACKUP              - Maak handmatig een backup');
  console.log('  EXIT                - Sluit het programma');
  console.log('----------------------------------');
  
  // Functie om commando's te verwerken
  function processCommand() {
    rl.question('> ', (input) => {
      const trimmedInput = input.trim();
      
      // Controleer commando's
      if (trimmedInput.toUpperCase() === 'EXIT') {
        saveChatMemory();
        createBackup();
        rl.close();
        console.log('Programma beëindigd. Chatgeheugen opgeslagen.');
        return;
      } else if (trimmedInput.toUpperCase() === 'SHOW') {
        showCurrentConversation();
      } else if (trimmedInput.toUpperCase() === 'BACKUP') {
        createBackup();
      } else if (trimmedInput.toUpperCase() === 'AI-SAVE') {
        aiTriggeredSave();
      } else if (trimmedInput.toUpperCase() === 'AI-LOAD') {
        aiTriggeredLoad();
      } else if (trimmedInput.startsWith('USER:')) {
        const content = trimmedInput.substring(5).trim();
        // Gebruikersberichten: niet automatisch opslaan
        addMessage('user', content, false);
      } else if (trimmedInput.startsWith('AI:')) {
        const content = trimmedInput.substring(3).trim();
        if (content.toLowerCase().includes('[save]')) {
          // Als de AI [save] in het bericht heeft, sla dan direct op
          const cleanContent = content.replace(/\[save\]/gi, '').trim();
          addMessage('assistant', cleanContent, true);
        } else {
          // Standaard AI berichten: niet automatisch opslaan
          addMessage('assistant', content, false);
        }
      } else {
        // Standaard als gebruikersbericht behandelen
        addMessage('user', trimmedInput, false);
      }
      
      processCommand();
    });
  }
  
  // Start de commandoverwerking
  processCommand();
}

// Stel de functies beschikbaar
module.exports = {
  addMessage,
  showCurrentConversation,
  saveChatMemory,
  loadChatMemory,
  createBackup,
  aiTriggeredLoad,
  aiTriggeredSave
};

// Begin met het dynamisch bijhouden van het geheugen
startAutomaticMemory(); 