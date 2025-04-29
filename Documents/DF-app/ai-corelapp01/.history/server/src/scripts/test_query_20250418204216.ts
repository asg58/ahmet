#!/usr/bin/env ts-node
/**
 * Test Query Script
 * 
 * This script tests querying the API documentation from ChromaDB.
 */

import { ChromaClient } from 'chromadb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set up ChromaDB connection
const chromaUrl = `http://localhost:${process.env.CHROMA_PORT || '8001'}`;
const API_DOCS_COLLECTION = 'api_documentation';

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
  
  // Get the collection
  const collection = await client.getCollection({
    name: API_DOCS_COLLECTION,
    embeddingFunction: null
  });
  
  // Test queries for CorelDRAW
  console.log('\n--- Testing CorelDRAW Queries ---');
  const corelQueries = [
    'How to create a new document in CorelDRAW?',
    'What properties are available on the Application object?'
  ];
  
  for (const query of corelQueries) {
    console.log(`\nQuery: "${query}"`);
    
    const results = await collection.query({
      queryTexts: [query],
      where: { platform: 'coreldraw' },
      nResults: 2
    });
    
    console.log('Results:');
    for (let i = 0; i < results.documents[0].length; i++) {
      console.log(`\n--- Document ${i+1} ---`);
      console.log(`Score: ${results.distances?.[0][i] || 'N/A'}`);
      console.log(`Content: ${results.documents[0][i]}`);
      console.log('Metadata:', results.metadatas[0][i]);
    }
  }
  
  // Test queries for Blender
  console.log('\n--- Testing Blender Queries ---');
  const blenderQueries = [
    'How to access Blender data structures?',
    'What are the main modules in the Blender Python API?'
  ];
  
  for (const query of blenderQueries) {
    console.log(`\nQuery: "${query}"`);
    
    const results = await collection.query({
      queryTexts: [query],
      where: { platform: 'blender' },
      nResults: 2
    });
    
    console.log('Results:');
    for (let i = 0; i < results.documents[0].length; i++) {
      console.log(`\n--- Document ${i+1} ---`);
      console.log(`Score: ${results.distances?.[0][i] || 'N/A'}`);
      console.log(`Content: ${results.documents[0][i]}`);
      console.log('Metadata:', results.metadatas[0][i]);
    }
  }
  
  console.log('\nQuery testing completed.');
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 