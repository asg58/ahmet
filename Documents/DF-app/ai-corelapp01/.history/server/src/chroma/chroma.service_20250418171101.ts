import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaClient, GetCollectionParams, OpenAIEmbeddingFunction } from 'chromadb';

@Injectable()
export class ChromaService implements OnModuleInit {
  private readonly logger = new Logger(ChromaService.name);
  private client: ChromaClient;
  private embeddingFunction: OpenAIEmbeddingFunction | null = null;
  
  constructor() {
    const host = process.env.CHROMA_HOST || 'localhost';
    const port = process.env.CHROMA_PORT || '8001';
    const url = `http://${host}:${port}`;
    
    this.client = new ChromaClient({ path: url });
    this.logger.log(`ChromaDB service initialized with URL: ${url}`);
  }
  
  async onModuleInit() {
    try {
      await this.pingChromaDB();
      await this.setupCollections();
    } catch (error) {
      this.logger.error(`Failed to initialize ChromaDB: ${error.message}`);
    }
  }
  
  async pingChromaDB(): Promise<boolean> {
    try {
      const heartbeat = await this.client.heartbeat();
      this.logger.debug(`ChromaDB heartbeat: ${heartbeat}`);
      return true;
    } catch (error) {
      this.logger.error(`ChromaDB ping failed: ${error.message}`);
      return false;
    }
  }
  
  private async setupCollections() {
    try {
      // Create collections for different types of data
      const apiDocsCollection = await this.client.getOrCreateCollection({
        name: 'api_documentation',
        metadata: { description: 'API documentation for CorelDRAW and Blender' },
        embeddingFunction: this.embeddingFunction,
      });
      
      const conversationMemoryCollection = await this.client.getOrCreateCollection({
        name: 'conversation_memory',
        metadata: { description: 'Long-term conversation memory for context' },
        embeddingFunction: this.embeddingFunction,
      });
      
      this.logger.log('ChromaDB collections setup completed');
    } catch (error) {
      this.logger.error(`Failed to setup ChromaDB collections: ${error.message}`);
      throw error;
    }
  }
  
  // Add API documentation to the vector database
  async addApiDocumentation(
    platform: 'coreldraw' | 'blender',
    documents: { text: string; metadata: Record<string, any> }[],
    embeddings?: number[][],
  ) {
    try {
      const collection = await this.client.getCollection({
        name: 'api_documentation',
        embeddingFunction: this.embeddingFunction,
      });
      
      const ids = documents.map((_, i) => `${platform}_doc_${Date.now()}_${i}`);
      
      await collection.add({
        ids,
        documents: documents.map(doc => doc.text),
        metadatas: documents.map(doc => ({ ...doc.metadata, platform })),
        embeddings,
      });
      
      this.logger.log(`Added ${documents.length} ${platform} API docs to ChromaDB`);
      return ids;
    } catch (error) {
      this.logger.error(`Failed to add API documentation: ${error.message}`);
      throw error;
    }
  }
  
  // Retrieve relevant API documentation based on a query
  async queryApiDocumentation(
    query: string,
    platform?: 'coreldraw' | 'blender',
    limit: number = 5,
  ) {
    try {
      const collection = await this.client.getCollection({
        name: 'api_documentation',
        embeddingFunction: this.embeddingFunction,
      });
      
      const queryOptions: Record<string, any> = {};
      
      if (platform) {
        queryOptions.where = { platform };
      }
      
      if (limit) {
        queryOptions.nResults = limit;
      }
      
      const results = await collection.query({
        queryTexts: [query],
        ...queryOptions,
      });
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to query API documentation: ${error.message}`);
      throw error;
    }
  }
  
  // Add conversation memory for long-term context
  async addConversationMemory(
    sessionId: string,
    text: string,
    metadata: Record<string, any>,
    embedding?: number[],
  ) {
    try {
      const collection = await this.client.getCollection({
        name: 'conversation_memory',
        embeddingFunction: this.embeddingFunction,
      });
      
      const id = `memory_${sessionId}_${Date.now()}`;
      
      await collection.add({
        ids: [id],
        documents: [text],
        metadatas: [{ ...metadata, sessionId }],
        embeddings: embedding ? [embedding] : undefined,
      });
      
      return id;
    } catch (error) {
      this.logger.error(`Failed to add conversation memory: ${error.message}`);
      throw error;
    }
  }
  
  // Retrieve relevant conversation memories based on a query
  async queryConversationMemory(
    query: string,
    sessionId: string,
    limit: number = 10,
  ) {
    try {
      const collection = await this.client.getCollection({
        name: 'conversation_memory',
        embeddingFunction: this.embeddingFunction,
      });
      
      const results = await collection.query({
        queryTexts: [query],
        where: { sessionId },
        nResults: limit,
      });
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to query conversation memory: ${error.message}`);
      throw error;
    }
  }
} 