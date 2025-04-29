/**
 * show-memory.js
 * 
 * Script voor het visualiseren van chat geheugen inhoud
 * Ondersteunt zowel handmatige als AI-getriggerde inspectie
 */

const fs = require('fs');
const path = require('path');

// Directory voor het bijhouden van de chat geschiedenis
const MEMORY_DIR = './chat-memory';
const MEMORY_FILE = path.join(MEMORY_DIR, 'ongoing-conversation.json');

// Functie om chat geheugen te laden
function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      console.log('Geen chat geheugen gevonden. Bestand bestaat niet.');
      return null;
    }
    
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Fout bij het laden van chat geheugen: ${error.message}`);
    return null;
  }
}

// Functie om metagegevens te tonen
function showMetadata(memory) {
  console.log('\n===== CHAT GEHEUGEN METADATA =====');
  console.log(`Start tijd         : ${memory.metadata.startTime}`);
  console.log(`Laatste update     : ${memory.metadata.lastUpdateTime}`);
  console.log(`Aantal berichten   : ${memory.metadata.messageCount}`);
  console.log(`AI-getriggerde saves: ${memory.metadata.aiTriggeredSaves}`);
  console.log(`AI-getriggerde reads: ${memory.metadata.aiTriggeredReads}`);
  console.log('=================================\n');
}

// Functie om berichten te tonen
function showMessages(memory, maxMessages = 10) {
  const messages = memory.messages;
  
  if (!messages || messages.length === 0) {
    console.log('Geen berichten in het geheugen.');
    return;
  }
  
  console.log(`\n===== LAATSTE ${Math.min(maxMessages, messages.length)} BERICHTEN (van ${messages.length} totaal) =====`);
  
  // Toon alleen de laatste X berichten
  const messagesToShow = messages.length > maxMessages ? 
    messages.slice(-maxMessages) : messages;
  
  if (messages.length > maxMessages) {
    console.log(`[... ${messages.length - maxMessages} eerdere berichten verborgen ...]`);
  }
  
  messagesToShow.forEach((msg, index) => {
    const actualIndex = messages.length - messagesToShow.length + index;
    const role = msg.role.toUpperCase().padEnd(10);
    
    // Verkort lange berichten voor weergave
    let content = msg.content;
    if (content.length > 100) {
      content = content.substring(0, 97) + '...';
    }
    
    console.log(`[${actualIndex + 1}] ${role}: ${content}`);
  });
  
  console.log('=================================\n');
}

// Functie om de samenvatting te tonen
function showSummary(memory) {
  if (!memory.summary) {
    console.log('Geen samenvatting beschikbaar.');
    return;
  }
  
  console.log('\n===== CONVERSATIE SAMENVATTING =====');
  console.log(memory.summary);
  console.log('===================================\n');
}

// Functie om het bevel te verwerken en bijbehorende functie uit te voeren
function processCommand() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  const maxMessages = parseInt(args[1], 10) || 10;
  
  const memory = loadMemory();
  if (!memory) return;
  
  // Controleer of dit een AI-getriggerde aanroep is
  const isAiTriggered = command === '--trigger-read';
  
  if (isAiTriggered) {
    // Update statistieken apart (als het een AI-trigger is), maar we slaan het niet direct op
    // omdat auto-chat-memory.js dit al doet
    console.log('AI-getriggerde geheugen weergave');
  }
  
  switch (command) {
    case 'metadata':
      showMetadata(memory);
      break;
    case 'messages':
      showMessages(memory, maxMessages);
      break;
    case 'summary':
      showSummary(memory);
      break;
    case '--trigger-read':
      // Voor AI-getriggerde weergave tonen we alles
      showMetadata(memory);
      showMessages(memory, maxMessages);
      showSummary(memory);
      break;
    case 'all':
    default:
      showMetadata(memory);
      showMessages(memory, maxMessages);
      showSummary(memory);
      break;
  }
}

// Start het script
processCommand(); 