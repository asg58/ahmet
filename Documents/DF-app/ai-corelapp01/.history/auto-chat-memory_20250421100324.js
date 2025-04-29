/**
 * auto-chat-memory.js
 * 
 * Script voor automatisch bijhouden van chat geheugen voor AI assistenten
 * Met ondersteuning voor AI-getriggerde acties
 */

const fs = require('fs');
const path = require('path');

// Directory voor het bijhouden van de chat geschiedenis
const MEMORY_DIR = './chat-memory';
const MEMORY_FILE = path.join(MEMORY_DIR, 'ongoing-conversation.json');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');

// Zorg ervoor dat de benodigde mappen bestaan
function ensureDirectoriesExist() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    console.log(`Map ${MEMORY_DIR} aangemaakt.`);
  }
  
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    console.log(`Map ${ARCHIVE_DIR} aangemaakt.`);
  }
}

// Initialiseer een nieuwe conversatie
function initializeConversation() {
  return {
    metadata: {
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      messageCount: 0,
      aiTriggeredSaves: 0,
      aiTriggeredReads: 0
    },
    messages: []
  };
}

// Laad de huidige conversatie of initialiseer een nieuwe
function loadConversation() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return initializeConversation();
    }
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    const conversation = JSON.parse(data);
    
    // Zorg ervoor dat metadata velden bestaan
    if (!conversation.metadata) {
      conversation.metadata = {};
    }
    
    // Voeg AI trigger velden toe als ze niet bestaan
    if (conversation.metadata.aiTriggeredSaves === undefined) {
      conversation.metadata.aiTriggeredSaves = 0;
    }
    if (conversation.metadata.aiTriggeredReads === undefined) {
      conversation.metadata.aiTriggeredReads = 0;
    }
    
    console.log(`Conversatie geladen met ${conversation.messages.length} berichten.`);
    return conversation;
  } catch (error) {
    console.error(`Fout bij laden van conversatie: ${error.message}`);
    return initializeConversation();
  }
}

// Sla de conversatie op naar bestand
function saveConversation(conversation, isAiTriggered = false) {
  try {
    // Update metadata
    conversation.metadata.lastUpdateTime = new Date().toISOString();
    conversation.metadata.messageCount = conversation.messages.length;
    
    // Verhoog AI-getriggerde opslag teller indien nodig
    if (isAiTriggered) {
      conversation.metadata.aiTriggeredSaves += 1;
    }
    
    const json = JSON.stringify(conversation, null, 2);
    fs.writeFileSync(MEMORY_FILE, json, 'utf8');
    console.log(`Conversatie opgeslagen met ${conversation.messages.length} berichten. ${isAiTriggered ? '(AI-getriggerd)' : ''}`);
  } catch (error) {
    console.error(`Fout bij opslaan van conversatie: ${error.message}`);
  }
}

// Voeg een gebruikersbericht toe aan de conversatie
function addUserMessage(conversation, message) {
  if (!message.trim()) return conversation;
  
  conversation.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Gebruikersbericht toegevoegd (${message.length} tekens)`);
  return conversation;
}

// Voeg een assistent (AI) bericht toe aan de conversatie
function addAssistantMessage(conversation, message) {
  if (!message.trim()) return conversation;
  
  conversation.messages.push({
    role: 'assistant',
    content: message,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Assistentbericht toegevoegd (${message.length} tekens)`);
  return conversation;
}

// Archiveer de huidige conversatie
function archiveConversation(conversation) {
  try {
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      console.log('Geen berichten om te archiveren.');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const archiveFile = path.join(ARCHIVE_DIR, `conversation-${timestamp}.json`);
    
    const json = JSON.stringify(conversation, null, 2);
    fs.writeFileSync(archiveFile, json, 'utf8');
    console.log(`Conversatie gearchiveerd naar ${archiveFile}`);
    
    // Maak een nieuw gesprek aan
    const newConversation = initializeConversation();
    saveConversation(newConversation);
  } catch (error) {
    console.error(`Fout bij archiveren van conversatie: ${error.message}`);
  }
}

// Toon de inhoud van de conversatie
function displayConversation(conversation) {
  console.log('\n======== HUIDIGE CONVERSATIE =========');
  console.log(`Berichten: ${conversation.messages.length}`);
  console.log(`Start: ${conversation.metadata.startTime}`);
  console.log(`Laatste update: ${conversation.metadata.lastUpdateTime}`);
  console.log(`AI-getriggerde opslagen: ${conversation.metadata.aiTriggeredSaves}`);
  console.log(`AI-getriggerde lezingen: ${conversation.metadata.aiTriggeredReads}`);
  console.log('--------------------------------------');
  
  // Toon de laatste 5 berichten (of minder als er minder zijn)
  const lastMessages = conversation.messages.slice(-5);
  lastMessages.forEach((msg, idx) => {
    const fullIndex = conversation.messages.length - lastMessages.length + idx + 1;
    const preview = msg.content.length > 50 ? 
      `${msg.content.substring(0, 47)}...` : 
      msg.content;
    console.log(`[${fullIndex}] ${msg.role.toUpperCase()}: ${preview}`);
  });
  
  console.log('======================================\n');
  return conversation;
}

// Voer interactieve modus uit
function runInteractiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('====== CHAT GEHEUGEN SYSTEEM ======');
  console.log('Commando\'s:');
  console.log('  USER: [tekst]     - Voeg gebruikersbericht toe');
  console.log('  AI: [tekst]       - Voeg AI assistentbericht toe');
  console.log('  SHOW              - Toon huidige conversatie');
  console.log('  SAVE              - Sla conversatie handmatig op');
  console.log('  LOAD              - Herlaad conversatie handmatig');
  console.log('  AI-SAVE           - Voer AI-getriggerde opslag uit');
  console.log('  AI-LOAD           - Voer AI-getriggerde herlaad uit');
  console.log('  ARCHIVE           - Archiveer conversatie en begin nieuw');
  console.log('  EXIT              - Beëindig het programma');
  console.log('==================================\n');
  
  // Laad of initialiseer de conversatie
  let conversation = loadConversation();
  displayConversation(conversation);
  
  function promptUser() {
    rl.question('> ', (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput.toUpperCase() === 'EXIT') {
        saveConversation(conversation);
        rl.close();
        console.log('Programma beëindigd. Conversatie opgeslagen.');
        return;
      }
      
      // Verwerk de commando's
      if (trimmedInput.toUpperCase() === 'SHOW') {
        displayConversation(conversation);
      } else if (trimmedInput.toUpperCase() === 'SAVE') {
        saveConversation(conversation);
      } else if (trimmedInput.toUpperCase() === 'LOAD') {
        conversation = loadConversation();
        displayConversation(conversation);
      } else if (trimmedInput.toUpperCase() === 'AI-SAVE') {
        saveConversation(conversation, true);
      } else if (trimmedInput.toUpperCase() === 'AI-LOAD') {
        conversation = loadConversation();
        conversation.metadata.aiTriggeredReads += 1;
        saveConversation(conversation);
        displayConversation(conversation);
      } else if (trimmedInput.toUpperCase() === 'ARCHIVE') {
        archiveConversation(conversation);
        conversation = loadConversation();
        displayConversation(conversation);
      } else if (trimmedInput.startsWith('USER:')) {
        const message = trimmedInput.substring(5).trim();
        conversation = addUserMessage(conversation, message);
        saveConversation(conversation);
      } else if (trimmedInput.startsWith('AI:')) {
        const message = trimmedInput.substring(3).trim();
        conversation = addAssistantMessage(conversation, message);
        saveConversation(conversation);
      } else {
        // Als geen commando gespecificeerd, behandel als gebruikersbericht
        conversation = addUserMessage(conversation, trimmedInput);
        saveConversation(conversation);
      }
      
      promptUser();
    });
  }
  
  promptUser();
}

// Voer de acties uit op basis van de commando's
function main() {
  ensureDirectoriesExist();
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Als er geen commando is opgegeven of 'interactive', start de interactieve modus
  if (!command || command.toLowerCase() === 'interactive') {
    runInteractiveMode();
    return;
  }
  
  // Laad de huidige conversatie
  const conversation = loadConversation();
  
  // Controleer of het een AI-getriggerde actie is
  const isAiTriggered = command === 'AI-SAVE' || command === 'AI-LOAD';
  
  switch (command) {
    case 'SAVE':
    case 'AI-SAVE':
      saveConversation(conversation, isAiTriggered);
      break;
    case 'LOAD':
    case 'AI-LOAD':
      // Als het een AI-getriggerde load is, verhoog de teller
      if (isAiTriggered) {
        conversation.metadata.aiTriggeredReads += 1;
        saveConversation(conversation, false); // Sla op maar tel dit niet als een AI-getriggerde opslag
      }
      displayConversation(conversation);
      break;
    case 'ARCHIVE':
      archiveConversation(conversation);
      break;
    case 'ADD-USER':
      if (args.length < 2) {
        console.log('Fout: Geen bericht opgegeven. Gebruik: node auto-chat-memory.js ADD-USER "je bericht hier"');
        break;
      }
      addUserMessage(conversation, args[1]);
      saveConversation(conversation);
      break;
    case 'ADD-AI':
      if (args.length < 2) {
        console.log('Fout: Geen bericht opgegeven. Gebruik: node auto-chat-memory.js ADD-AI "je bericht hier"');
        break;
      }
      addAssistantMessage(conversation, args[1]);
      saveConversation(conversation);
      break;
    case 'SHOW':
      displayConversation(conversation);
      break;
    default:
      console.log(`
Gebruik: node auto-chat-memory.js [commando]

Beschikbare commando's:
  interactive    - Start interactieve modus (standaard)
  SAVE           - Sla de huidige conversatie op
  LOAD           - Laad de huidige conversatie
  ARCHIVE        - Archiveer de huidige conversatie en start een nieuwe
  ADD-USER "msg" - Voeg een gebruikersbericht toe
  ADD-AI "msg"   - Voeg een AI-bericht toe
  SHOW           - Toon de huidige conversatie
  
AI-getriggerde commando's:
  AI-SAVE        - Sla op via AI-trigger (telt mee in statistieken)
  AI-LOAD        - Laad via AI-trigger (telt mee in statistieken)
`);
  }
}

// Auto-start het programma
main(); 