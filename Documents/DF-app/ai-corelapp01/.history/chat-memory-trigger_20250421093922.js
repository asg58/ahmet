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
 * Directe functie om berichten toe te voegen zonder externe script aanroep
 * Deze functie leest, actualiseert, en slaat op in één bewerking
 */
function addMessage(role, content) {
  try {
    ensureDirectoryExists();
    
    // Lees bestaande conversatie of maak nieuwe
    let conversation;
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = fs.readFileSync(MEMORY_FILE, 'utf8');
        conversation = JSON.parse(data);
      } else {
        conversation = {
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
    } catch (error) {
      console.error(`Fout bij laden conversatie: ${error.message}`);
      // Als er een fout is, maken we een nieuwe conversatie
      conversation = {
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
    
    // Voeg bericht toe
    conversation.messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    
    // Update metadata
    conversation.metadata.lastUpdateTime = new Date().toISOString();
    conversation.metadata.messageCount = conversation.messages.length;
    
    // Als het een AI-bericht is dat opslaat, verhoog de teller
    if (role === 'assistant') {
      conversation.metadata.aiTriggeredSaves++;
    }
    
    // Sla op
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(conversation, null, 2), 'utf8');
    console.log(`${role.toUpperCase()}-bericht toegevoegd en opgeslagen. Nu ${conversation.messages.length} berichten totaal.`);
    
    return true;
  } catch (error) {
    console.error(`Fout bij toevoegen van bericht: ${error.message}`);
    return false;
  }
}

/**
 * Zorg ervoor dat de geheugen directory bestaat
 */
function ensureDirectoryExists() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    console.log(`Map ${MEMORY_DIR} aangemaakt.`);
  }
}

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
      console.log(`Totaal aantal berichten: ${chatMemory.messages ? chatMemory.messages.length : 0}`);
      
      if (chatMemory.messages && chatMemory.messages.length > 0) {
        const lastMessage = chatMemory.messages[chatMemory.messages.length - 1];
        console.log(`Laatste bericht: ${lastMessage.role.toUpperCase()} op ${new Date(lastMessage.timestamp).toLocaleString()}`);
        
        // Toon de laatste paar berichten
        console.log('\nLaatste berichten:');
        const lastFew = chatMemory.messages.slice(-3);
        lastFew.forEach((msg, idx) => {
          const actualIdx = chatMemory.messages.length - lastFew.length + idx;
          const shortContent = msg.content.length > 50 ? 
            `${msg.content.substring(0, 47)}...` : 
            msg.content;
          console.log(`[${actualIdx + 1}] ${msg.role.toUpperCase()}: ${shortContent}`);
        });
      }
    } else {
      console.log('Geen AI-trigger metadata beschikbaar.');
    }
    console.log('===========================================\n');
  } catch (error) {
    console.error('Fout bij het lezen van statistieken:', error.message);
  }
}

/**
 * Auto-inlezen van geheugen tijdens opstart
 * Keert true terug als er succesvol is ingelezen, anders false
 */
function autoLoadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      console.log('Geen bestaand geheugen gevonden om in te lezen.');
      return false;
    }
    
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    const memory = JSON.parse(data);
    
    if (!memory || !memory.messages || memory.messages.length === 0) {
      console.log('Geheugenbestand bestaat maar bevat geen berichten.');
      return false;
    }
    
    // Verhoog de AI-herlaad teller en sla op
    if (!memory.metadata) memory.metadata = {};
    if (memory.metadata.aiTriggeredReads === undefined) {
      memory.metadata.aiTriggeredReads = 1;
    } else {
      memory.metadata.aiTriggeredReads++;
    }
    
    memory.metadata.lastUpdateTime = new Date().toISOString();
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
    
    const messageCount = memory.messages.length;
    console.log(`Auto-inlezen succesvol: ${messageCount} berichten ingelezen.`);
    
    // Toon een korte samenvatting van de inhoud
    if (messageCount > 0) {
      console.log('\nLaatste paar berichten:');
      const lastFew = memory.messages.slice(-3);
      lastFew.forEach((msg, idx) => {
        const actualIdx = memory.messages.length - lastFew.length + idx;
        const shortContent = msg.content.length > 50 ? 
          `${msg.content.substring(0, 47)}...` : 
          msg.content;
        console.log(`[${actualIdx + 1}] ${msg.role.toUpperCase()}: ${shortContent}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Fout bij auto-inlezen: ${error.message}`);
    return false;
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
  case 'add-user':
    if (args.length < 2) {
      console.log('Fout: Geen bericht opgegeven. Gebruik: node chat-memory-trigger.js add-user "je bericht hier"');
      break;
    }
    addMessage('user', args[1]);
    break;
  case 'add-ai':
    if (args.length < 2) {
      console.log('Fout: Geen bericht opgegeven. Gebruik: node chat-memory-trigger.js add-ai "je bericht hier"');
      break;
    }
    addMessage('assistant', args[1]);
    break;
  case 'auto-load':
    autoLoadMemory();
    break;
  default:
    // Als geen commando opgegeven is, voer automatisch inlezen uit
    if (!command) {
      console.log('Geen commando opgegeven, voer auto-load uit...');
      autoLoadMemory();
      break;
    }
    
    console.log(`
Gebruik: node chat-memory-trigger.js [commando]

Beschikbare commando's:
  save       - Voer een AI-getriggerde geheugenopslag uit
  load       - Voer een AI-getriggerde geheugenherlading uit
  stats      - Toon statistieken over AI-getriggerde acties
  add-user   - Voeg direct een gebruikersbericht toe
  add-ai     - Voeg direct een AI bericht toe
  auto-load  - Laad automatisch het geheugen in (standaard bij geen commando)
`);
} 