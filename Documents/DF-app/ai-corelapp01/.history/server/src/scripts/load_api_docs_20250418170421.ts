#!/usr/bin/env ts-node
/**
 * Load API Documentation into ChromaDB
 * 
 * This script loads the API documentation collected by the api_docs_scraper.py
 * into ChromaDB for use by the LLM model.
 */

import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Command } from 'commander';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set up ChromaDB connection
const chromaUrl = `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || '8001'}`;
const openAiApiKey = process.env.OPENAI_API_KEY;

// Default data directory
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../../data/api-docs');
const API_DOCS_COLLECTION = 'api_documentation';

// Define interfaces for document structure
interface ApiDocument {
  text: string;
  metadata: {
    title: string;
    source: string;
    platform: string;
    part: number;
    total_parts: number;
    type?: string;
    [key: string]: any;
  };
}

// Initialize the program
const program = new Command();
program
  .name('load-api-docs')
  .description('Load API documentation into ChromaDB')
  .option('-d, --data-dir <path>', 'Directory containing API documentation JSON files', DEFAULT_DATA_DIR)
  .option('-p, --platform <platform>', 'Platform to load (coreldraw, blender, or all)', 'all')
  .option('-e, --embeddings <model>', 'Embeddings model to use (openai or none)', 'none')
  .option('-r, --reset', 'Reset the collection before loading', false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log(`Connecting to ChromaDB at ${chromaUrl}...`);
  
  // Initialize ChromaDB client
  const client = new ChromaClient({ path: chromaUrl });
  
  // Test connection
  try {
    const heartbeat = await client.heartbeat();
    console.log(`ChromaDB is alive with heartbeat: ${heartbeat}`);
  } catch (error) {
    console.error(`Failed to connect to ChromaDB: ${error}`);
    process.exit(1);
  }
  
  // Initialize embedding function
  let embeddingFunction = null;
  if (options.embeddings === 'openai') {
    if (!openAiApiKey) {
      console.error('OpenAI API key not found. Set OPENAI_API_KEY in .env file.');
      process.exit(1);
    }
    console.log('Using OpenAI embeddings...');
    embeddingFunction = new OpenAIEmbeddingFunction({
      openai_api_key: openAiApiKey,
      model_name: 'text-embedding-ada-002',
    });
  } else {
    console.log('Not using embeddings, ChromaDB will use default embeddings');
  }
  
  // Reset collection if requested
  if (options.reset) {
    try {
      console.log(`Resetting collection ${API_DOCS_COLLECTION}...`);
      const collections = await client.listCollections();
      if (collections.some(c => c.name === API_DOCS_COLLECTION)) {
        await client.deleteCollection({ name: API_DOCS_COLLECTION });
      }
    } catch (error) {
      console.error(`Failed to reset collection: ${error}`);
    }
  }
  
  // Get or create collection
  console.log(`Getting or creating collection ${API_DOCS_COLLECTION}...`);
  const collection = await client.getOrCreateCollection({
    name: API_DOCS_COLLECTION,
    embeddingFunction,
    metadata: {
      description: 'API documentation for CorelDRAW and Blender'
    }
  });
  
  // Load documentation
  const platforms = options.platform === 'all' 
    ? ['coreldraw', 'blender'] 
    : [options.platform];
  
  for (const platform of platforms) {
    const platformDir = path.join(options.dataDir, platform);
    
    if (!fs.existsSync(platformDir)) {
      console.warn(`Platform directory not found: ${platformDir}`);
      continue;
    }
    
    console.log(`Loading ${platform} documentation from ${platformDir}...`);
    
    // Check if manifest file exists
    const manifestPath = path.join(platformDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`Found manifest with ${manifest.count} documents.`);
    }
    
    // Collect document files
    const docFiles = fs.readdirSync(platformDir)
      .filter(file => file.match(/^doc_\d+\.json$/))
      .map(file => path.join(platformDir, file));
    
    console.log(`Found ${docFiles.length} document files.`);
    
    // Process documents in batches
    const batchSize = 100;
    for (let i = 0; i < docFiles.length; i += batchSize) {
      const batch = docFiles.slice(i, i + batchSize);
      const documents: ApiDocument[] = [];
      
      // Load documents from files
      for (const file of batch) {
        try {
          const doc = JSON.parse(fs.readFileSync(file, 'utf-8')) as ApiDocument;
          documents.push(doc);
        } catch (error) {
          console.error(`Failed to parse document file ${file}: ${error}`);
        }
      }
      
      // Add to ChromaDB
      if (documents.length > 0) {
        console.log(`Adding batch of ${documents.length} documents...`);
        
        try {
          await collection.add({
            ids: documents.map((_, idx) => `${platform}_${i + idx}`),
            documents: documents.map(doc => doc.text),
            metadatas: documents.map(doc => doc.metadata),
          });
        } catch (error) {
          console.error(`Failed to add batch to ChromaDB: ${error}`);
        }
      }
    }
    
    console.log(`Completed loading ${platform} documentation.`);
  }
  
  // Get collection count
  const count = await collection.count();
  console.log(`Total documents in collection: ${count}`);
  
  console.log('Done!');
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 