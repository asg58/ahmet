import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';

@Injectable()
export class ChromaService {
  private readonly logger = new Logger(ChromaService.name);
  private client: ChromaClient;
  private collections: { [key: string]: Collection } = {};
  private isInitialized = false;
  private connectionError = false;
  private isInitializing = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private maxRetries = 5;
  private retryCount = 0;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('CHROMADB_HOST') || 'localhost';
    const port = this.configService.get<number>('CHROMADB_PORT') || 8000;
    const protocol = this.configService.get<string>('CHROMADB_PROTOCOL') || 'http';
    
    this.logger.log(`Initializing ChromaDB client with connection: ${protocol}://${host}:${port}`);
    
    this.client = new ChromaClient({
      path: `${protocol}://${host}:${port}`
    });
    
    // Non-blocking initialization
    this.initializeAsync();
  }
  
  private async initializeAsync() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      this.logger.log(`Attempting to connect to ChromaDB (attempt ${this.retryCount + 1}/${this.maxRetries})`);
      
      // Test connection with simple ping
      await this.pingChromaDB();
      
      // Proceed with collection setup
      await this.setupCollections();
      
      this.isInitialized = true;
      this.connectionError = false;
      this.retryCount = 0; // Reset retry counter on success
      this.logger.log('Successfully connected to ChromaDB');
    } catch (error) {
      this.connectionError = true;
      this.logger.error(`Failed to initialize ChromaDB: ${error.message || 'Unknown error'}`);
      
      // Set up retry mechanism
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Exponential backoff, max 30s
        this.logger.log(`Will retry ChromaDB connection in ${delay/1000} seconds`);
        
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }
        
        this.retryTimeout = setTimeout(() => {
          this.isInitializing = false;
          this.initializeAsync();
        }, delay);
      } else {
        this.logger.warn(`Max retries (${this.maxRetries}) reached for ChromaDB connection, service will operate in degraded mode`);
      }
    } finally {
      if (this.isInitialized || this.retryCount >= this.maxRetries) {
        this.isInitializing = false;
      }
    }
  }
  
  private async pingChromaDB() {
    try {
      await this.client.heartbeat();
      this.logger.log('ChromaDB ping successful');
    } catch (error) {
      this.logger.error(`ChromaDB ping failed: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }
  
  private async setupCollections() {
    try {
      // Get list of existing collections
      const existingCollections = await this.client.listCollections();
      this.logger.log(`Found ${existingCollections.length} existing collections in ChromaDB`);
      
      // Setup your required collections 
      // (Assuming you had existing collection setup logic here, keep it but with better error handling)
      // ... existing collection setup code ...
      
    } catch (error) {
      this.logger.error(`Failed to setup ChromaDB collections: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }
  
  // Make sure public methods handle the case when ChromaDB is not available
  async query(collectionName: string, query: any) {
    if (!this.isInitialized) {
      if (!this.connectionError && !this.isInitializing) {
        // Try to initialize if we haven't tried before or hit max retries
        await this.initializeAsync();
      }
      
      if (!this.isInitialized) {
        this.logger.warn('ChromaDB not initialized, returning empty result for query');
        return { matches: [], documents: [] }; // Return empty result as fallback
      }
    }
    
    try {
      // Check if collection exists
      if (!this.collections[collectionName]) {
        this.logger.warn(`Collection ${collectionName} not found, returning empty result`);
        return { matches: [], documents: [] };
      }
      
      return await this.collections[collectionName].query(query);
    } catch (error) {
      this.logger.error(`ChromaDB query error: ${error.message}`);
      return { matches: [], documents: [] }; // Return empty result as fallback
    }
  }
  
  // Add similar error handling to other public methods
  // ... rest of existing code ...
} 