const fs = require('fs');
const path = require('path');

// Directory voor het bijhouden van de chat geschiedenis
const MEMORY_DIR = './chat-memory';
const MEMORY_FILE = path.join(MEMORY_DIR, 'ongoing-conversation.json');

// Functie om het laatst bijgewerkte geheugen te lezen en te tonen
function displayChatMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    console.log('\n\n=== GEEN CHATGEHEUGEN GEVONDEN ===');
    console.log('Start eerst auto-chat-memory.js om gesprekken op te slaan');
    console.log('===============================\n\n');
    return;
  }

  try {
    // Lees het geheugenbestand
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    const chatMemory = JSON.parse(data);
    
    // Controleer geldigheid
    if (!chatMemory || !Array.isArray(chatMemory.messages)) {
      console.log('\n\n=== ONGELDIG CHATGEHEUGEN FORMAT ===\n\n');
      return;
    }
    
    // Toon geheugeninformatie
    console.log('\n\n======================================================');
    console.log(`=== CHATGEHEUGEN (${chatMemory.messages.length} berichten) ===`);
    console.log(`=== Laatste update: ${new Date(chatMemory.lastUpdated).toLocaleString()} ===`);
    console.log('======================================================');
    
    // Toon maximaal de laatste 15 berichten voor overzicht
    const messagesToShow = chatMemory.messages.slice(-15);
    
    if (messagesToShow.length === 0) {
      console.log('\nGeen berichten in het geheugen.\n');
    } else {
      if (chatMemory.messages.length > 15) {
        console.log(`\n[...${chatMemory.messages.length - 15} eerdere berichten weggelaten...]\n`);
      }
      
      // Toon de berichten geformatteerd
      messagesToShow.forEach((msg, index) => {
        const actualIndex = chatMemory.messages.length - messagesToShow.length + index + 1;
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        console.log(`\n[${actualIndex}] ${msg.role.toUpperCase()} (${timestamp}):`);
        console.log(`${msg.content}\n`);
        console.log('------------------------------------------------------');
      });
    }
    
    console.log('\n======================================================\n\n');
  } catch (error) {
    console.error('Fout bij het lezen van het chatgeheugen:', error.message);
  }
}

// Start de weergave
displayChatMemory();

// Als dit script in periodieke weergavemodus wordt uitgevoerd (optioneel)
if (process.argv.includes('--watch')) {
  console.log('Periodieke weergavemodus geactiveerd. Druk Ctrl+C om te stoppen.');
  
  // Toon elke 30 seconden de laatste conversatiestand
  setInterval(displayChatMemory, 30000);
} 