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
    fs.mkdirSync(MEMORY_DIR);
    console.log(`Map ${MEMORY_DIR} aangemaakt.`);
  }
  
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR);
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

// Voer de acties uit op basis van de commando's
function main() {
  ensureDirectoriesExist();
  const args = process.argv.slice(2);
  const command = args[0];
  
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
      console.log(`Conversatie geladen met ${conversation.messages.length} berichten. ${isAiTriggered ? '(AI-getriggerd)' : ''}`);
      // Als het een AI-getriggerde load is, verhoog de teller
      if (isAiTriggered) {
        conversation.metadata.aiTriggeredReads += 1;
        saveConversation(conversation, false); // Sla op maar tel dit niet als een AI-getriggerde opslag
      }
      break;
    case 'ARCHIVE':
      archiveConversation(conversation);
      break;
    default:
      console.log(`
Gebruik: node auto-chat-memory.js [commando]

Beschikbare commando's:
  SAVE    - Sla de huidige conversatie op
  LOAD    - Laad de huidige conversatie
  ARCHIVE - Archiveer de huidige conversatie en start een nieuwe
  
AI-getriggerde commando's:
  AI-SAVE - Sla op via AI-trigger (telt mee in statistieken)
  AI-LOAD - Laad via AI-trigger (telt mee in statistieken)
`);
  }
}

main(); 