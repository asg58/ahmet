import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChatMessage } from '../ollama/ollama.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ChatMemoryEntry {
  sessionId: string;
  timestamp: string;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
}

@Injectable()
export class ChatMemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatMemoryService.name);
  private chatMemory: Map<string, ChatMemoryEntry> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly memoryFilePath: string;
  private readonly backupFilePath: string;
  private memoryDirty = false;

  constructor() {
    // Bepaal het pad voor het opslaan van de chatgeheugenbestanden
    const memoryDir = process.env.CHAT_MEMORY_DIR || './data/memory';
    
    // Zorg ervoor dat de directory bestaat
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
      this.logger.log(`Chat memory directory created: ${memoryDir}`);
    }
    
    this.memoryFilePath = path.join(memoryDir, 'chat-memory.json');
    this.backupFilePath = path.join(memoryDir, 'chat-memory-backup.json');
    this.logger.log(`Chat memory will be stored at: ${this.memoryFilePath}`);
  }

  async onModuleInit() {
    // Laad bestaand geheugen als het bestaat
    await this.loadMemoryFromDisk();
    
    // Start de periodieke update (elke minuut)
    this.startPeriodicUpdate(60000); // 60000 ms = 1 minuut
  }

  onModuleDestroy() {
    // Stop de periodieke update
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Sla het geheugen op voordat de applicatie stopt
    this.saveMemoryToDisk().catch(err => {
      this.logger.error(`Failed to save chat memory on shutdown: ${err.message}`);
    });
  }

  /**
   * Start de periodieke update van het chatgeheugen
   */
  private startPeriodicUpdate(intervalMs: number) {
    this.updateInterval = setInterval(() => {
      if (this.memoryDirty) {
        this.saveMemoryToDisk().catch(err => {
          this.logger.error(`Periodic chat memory update failed: ${err.message}`);
        });
        this.memoryDirty = false;
      }
    }, intervalMs);
    
    this.logger.log(`Periodic chat memory updates started (interval: ${intervalMs}ms)`);
  }

  /**
   * Laad het chatgeheugen van de schijf
   */
  private async loadMemoryFromDisk(): Promise<void> {
    try {
      if (fs.existsSync(this.memoryFilePath)) {
        const data = await fs.promises.readFile(this.memoryFilePath, 'utf8');
        const memoryData = JSON.parse(data) as ChatMemoryEntry[];
        
        // Reset huidige geheugen en laad data
        this.chatMemory.clear();
        for (const entry of memoryData) {
          this.chatMemory.set(entry.sessionId, entry);
        }
        
        this.logger.log(`Loaded ${memoryData.length} chat sessions from disk`);
      } else {
        this.logger.log('No existing chat memory file found, starting with empty memory');
      }
    } catch (error) {
      this.logger.error(`Failed to load chat memory: ${error.message}`);
      
      // Probeer de backup te laden als de hoofdfile corrupt is
      if (fs.existsSync(this.backupFilePath)) {
        try {
          const backupData = await fs.promises.readFile(this.backupFilePath, 'utf8');
          const backupMemoryData = JSON.parse(backupData) as ChatMemoryEntry[];
          
          this.chatMemory.clear();
          for (const entry of backupMemoryData) {
            this.chatMemory.set(entry.sessionId, entry);
          }
          
          this.logger.log(`Recovered ${backupMemoryData.length} chat sessions from backup`);
        } catch (backupError) {
          this.logger.error(`Failed to load backup chat memory: ${backupError.message}`);
        }
      }
    }
  }

  /**
   * Sla het chatgeheugen op naar de schijf
   */
  private async saveMemoryToDisk(): Promise<void> {
    try {
      // Maak eerst een backup van het bestaande bestand als het bestaat
      if (fs.existsSync(this.memoryFilePath)) {
        await fs.promises.copyFile(this.memoryFilePath, this.backupFilePath);
      }
      
      // Converteer de Map naar een array van entries
      const memoryData = Array.from(this.chatMemory.values());
      
      // Sla het op als JSON
      await fs.promises.writeFile(
        this.memoryFilePath,
        JSON.stringify(memoryData, null, 2),
        'utf8'
      );
      
      this.logger.debug(`Saved ${memoryData.length} chat sessions to disk`);
    } catch (error) {
      this.logger.error(`Failed to save chat memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Voeg een chatbericht toe aan het geheugen
   */
  addChatMessage(sessionId: string, message: ChatMessage, metadata?: Record<string, any>): void {
    // Haal de bestaande entry op of maak een nieuwe als die niet bestaat
    if (!this.chatMemory.has(sessionId)) {
      this.chatMemory.set(sessionId, {
        sessionId,
        timestamp: new Date().toISOString(),
        messages: [],
        metadata: metadata || {}
      });
    }
    
    const memoryEntry = this.chatMemory.get(sessionId);
    
    // Voeg het bericht toe aan de geschiedenis
    memoryEntry.messages.push(message);
    
    // Update de timestamp
    memoryEntry.timestamp = new Date().toISOString();
    
    // Update metadata als die is meegegeven
    if (metadata) {
      memoryEntry.metadata = { ...memoryEntry.metadata, ...metadata };
    }
    
    // Markeer het geheugen als gewijzigd zodat het bij de volgende update wordt opgeslagen
    this.memoryDirty = true;
  }

  /**
   * Voeg een volledige conversatie toe aan het geheugen
   */
  addConversation(sessionId: string, messages: ChatMessage[], metadata?: Record<string, any>): void {
    this.chatMemory.set(sessionId, {
      sessionId,
      timestamp: new Date().toISOString(),
      messages: [...messages],
      metadata: metadata || {}
    });
    
    this.memoryDirty = true;
  }

  /**
   * Haal een specifieke chatsessie op
   */
  getConversation(sessionId: string): ChatMemoryEntry | undefined {
    return this.chatMemory.get(sessionId);
  }

  /**
   * Haal alle chatsessies op
   */
  getAllConversations(): ChatMemoryEntry[] {
    return Array.from(this.chatMemory.values());
  }

  /**
   * Zoek relevante eerdere gesprekken op basis van sleutelwoorden
   */
  findRelevantConversations(keywords: string[], limit: number = 5): ChatMemoryEntry[] {
    const entries = Array.from(this.chatMemory.values());
    
    // Score elke entry op basis van het aantal voorkomens van sleutelwoorden
    const scoredEntries = entries.map(entry => {
      // Combineer alle berichten in één tekst
      const allText = entry.messages.map(msg => msg.content).join(' ').toLowerCase();
      
      // Tel hoe vaak elk sleutelwoord voorkomt
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(keyword.toLowerCase(), 'g');
        const matches = allText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      return { entry, score };
    });
    
    // Sorteer op score (hoog naar laag) en pak de top 'limit'
    return scoredEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry);
  }

  /**
   * Verwijder een specifieke chatsessie
   */
  removeConversation(sessionId: string): boolean {
    const removed = this.chatMemory.delete(sessionId);
    if (removed) {
      this.memoryDirty = true;
    }
    return removed;
  }

  /**
   * Forceer een onmiddellijke opslag van het geheugen
   */
  async forceSave(): Promise<void> {
    return this.saveMemoryToDisk();
  }
} 