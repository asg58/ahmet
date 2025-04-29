import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';

export interface Intent {
  type: string;
  platform: 'coreldraw' | 'blender' | 'general';
  confidence: number;
  entities?: Record<string, any>;
  action?: string;
}

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);
  
  constructor(private readonly ollamaService: OllamaService) {}
  
  async detectIntent(message: string, conversationHistory: ChatMessage[]): Promise<Intent> {
    try {
      this.logger.debug(`Detecting intent for message: ${message}`);
      
      // Create a prompt to analyze the intent
      const intentPrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `Je bent een intent recognition system dat gebruikersintenties identificeert voor een AI-agent die CorelDRAW en Blender aanstuurt.
          
Classificeer de gebruikersintentie in een van de volgende types:
1. CREATE - Aanmaken van nieuwe objecten/elementen
2. MODIFY - Wijzigen van bestaande objecten/elementen
3. DELETE - Verwijderen van objecten/elementen
4. QUERY - Een vraag over een functie of mogelijkheid
5. HELP - Hulp bij een taak of functie
6. SWITCH - Wisselen tussen applicaties (CorelDRAW <-> Blender)
7. UNDO - Ongedaan maken van een vorige actie
8. SAVE - Opslaan van een bestand/project
9. GENERAL - Algemene conversatie niet gerelateerd aan ontwerpen

Bepaal ook welk platform van toepassing is:
- coreldraw: als het verzoek specifiek is voor CorelDRAW (vectorontwerp)
- blender: als het verzoek specifiek is voor Blender (3D-modellering)
- general: als het platformonafhankelijk is of geen van beide specifiek wordt genoemd

Geef je antwoord in JSON formaat met de volgende structuur:
{
  "type": "[INTENT_TYPE]",
  "platform": "[coreldraw|blender|general]",
  "confidence": [0.0-1.0],
  "entities": {
    // Relevante entiteiten zoals objectnamen, kleuren, afmetingen, etc.
  },
  "action": "[specifieke actie om uit te voeren]"
}`,
        },
      ];
      
      // Add conversation history for context (but limit it to save tokens)
      const contextWindow = conversationHistory.slice(-5);
      intentPrompt.push(...contextWindow);
      
      // Add the current message
      intentPrompt.push({
        role: 'user',
        content: `Analyseer de volgende gebruikersinvoer en bepaal de intentie: "${message}"`,
      });
      
      // Make API call to Ollama
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3.2:11b-q4_K_M', // Intent router model
        messages: intentPrompt,
        temperature: 0.2, // Lower temperature for more predictable/factual responses
      });
      
      // Extract the intent JSON from the response
      const content = response.choices[0].message.content;
      
      try {
        // Try to find and parse the JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const intentJson = JSON.parse(jsonMatch[0]);
          this.logger.debug(`Intent detected: ${JSON.stringify(intentJson)}`);
          return intentJson;
        } else {
          throw new Error('No JSON object found in response');
        }
      } catch (parseError) {
        this.logger.error(`Failed to parse intent JSON: ${parseError.message}`);
        // Fallback to default intent
        return {
          type: 'GENERAL',
          platform: 'general',
          confidence: 0.5,
          action: 'respond_to_user',
        };
      }
    } catch (error) {
      this.logger.error(`Intent detection error: ${error.message}`);
      return {
        type: 'GENERAL',
        platform: 'general',
        confidence: 0.3,
        action: 'respond_to_user',
      };
    }
  }
} 