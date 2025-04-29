/**
 * chat-memory-trigger.js
 * 
 * Script om AI-geactiveerde chatgeheugen acties uit te voeren.
 * Dit script kan worden aangeroepen door de AI-assistent om dynamisch 
 * het geheugen op te slaan of te herladen wanneer dat nodig is.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Directory voor het bijhouden van de chat geschiedenis
const MEMORY_DIR = './chat-memory';
const MEMORY_FILE = path.join(MEMORY_DIR, 'ongoing-conversation.json');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

/**
 * AI-getriggerde opslag van chatgeheugen
 * Voert het auto-chat-memory.js script uit met het AI-SAVE commando
 */
function triggerSave() {
  console.log('AI-getriggerde opslag wordt uitgevoerd...');
  exec('node auto-chat-memory.js AI-SAVE', (error, stdout, stderr) => {
    if (error) {
      console.error(`Fout bij uitvoeren van AI-getriggerde opslag: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Fout: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}

/**
 * AI-getriggerde herlading van chatgeheugen
 * Voert het auto-chat-memory.js script uit met het AI-LOAD commando
 * en daarna show-memory.js met --trigger-read flag
 */
function triggerLoad() {
  console.log('AI-getriggerde herlading wordt uitgevoerd...');
  exec('node auto-chat-memory.js AI-LOAD && node show-memory.js --trigger-read', (error, stdout, stderr) => {
    if (error) {
      console.error(`Fout bij uitvoeren van AI-getriggerde herlading: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Fout: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}

/**
 * Toon statistieken over AI-getriggerde acties
 */
function showStats() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      console.log('Geen chatgeheugen gevonden. Start eerst auto-chat-memory.js.');
      return;
    }

    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    const chatMemory = JSON.parse(data);
    
    console.log('\n=== AI Chatgeheugen Trigger Statistieken ===');
    if (chatMemory.metadata) {
      console.log(`AI-getriggerde opslagen: ${chatMemory.metadata.aiTriggeredSaves || 0}`);
      console.log(`AI-getriggerde herladingen: ${chatMemory.metadata.aiTriggeredReads || 0}`);
      
      if (chatMemory.messages && chatMemory.messages.length > 0) {
        const lastMessage = chatMemory.messages[chatMemory.messages.length - 1];
        console.log(`Laatste bericht: ${lastMessage.role.toUpperCase()} op ${new Date(lastMessage.timestamp).toLocaleString()}`);
      }
    } else {
      console.log('Geen AI-trigger metadata beschikbaar.');
    }
    console.log('===========================================\n');
  } catch (error) {
    console.error('Fout bij het lezen van statistieken:', error.message);
  }
}

// Verwerk het opgegeven commando
switch (command) {
  case 'save':
    triggerSave();
    break;
  case 'load':
    triggerLoad();
    break;
  case 'stats':
    showStats();
    break;
  default:
    console.log(`
Gebruik: node chat-memory-trigger.js [commando]

Beschikbare commando's:
  save   - Voer een AI-getriggerde geheugenopslag uit
  load   - Voer een AI-getriggerde geheugenherlading uit
  stats  - Toon statistieken over AI-getriggerde acties
`);
} 