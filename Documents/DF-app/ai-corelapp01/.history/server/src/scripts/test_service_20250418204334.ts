#!/usr/bin/env ts-node
/**
 * Test ChromaService
 * 
 * This script tests the ChromaService directly to query API documentation.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Constants
const API_DOCS_COLLECTION = 'api_documentation';

async function main() {
  console.log('Testing ChromaDB connectivity...');
  
  // Using localhost explicitly since we're outside the Docker network
  const chromaUrl = 'http://localhost:8001';
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
  
  // Get collection count
  const count = await collection.count();
  console.log(`Total documents in collection: ${count}`);
  
  // Test queries for CorelDRAW
  console.log('\n--- Testing CorelDRAW Queries ---');
  const corelQueries = [
    'How to create a new document in CorelDRAW?',
    'What properties are available on the Application object?'
  ];
  
  for (const query of corelQueries) {
    console.log(`\nQuery: "${query}"`);
    
    try {
      const results = await collection.query({
        queryTexts: [query],
        where: { platform: 'coreldraw' },
        nResults: 2
      });
      
      console.log('Results:');
      if (results.documents && results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          console.log(`\n--- Document ${i+1} ---`);
          console.log(`Score: ${results.distances?.[0][i] || 'N/A'}`);
          console.log(`Content: ${results.documents[0][i]}`);
          console.log('Metadata:', results.metadatas?.[0][i] || 'N/A');
        }
      } else {
        console.log('No documents found.');
      }
    } catch (error) {
      console.error(`Error querying for "${query}": ${error.message}`);
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
    
    try {
      const results = await collection.query({
        queryTexts: [query],
        where: { platform: 'blender' },
        nResults: 2
      });
      
      console.log('Results:');
      if (results.documents && results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          console.log(`\n--- Document ${i+1} ---`);
          console.log(`Score: ${results.distances?.[0][i] || 'N/A'}`);
          console.log(`Content: ${results.documents[0][i]}`);
          console.log('Metadata:', results.metadatas?.[0][i] || 'N/A');
        }
      } else {
        console.log('No documents found.');
      }
    } catch (error) {
      console.error(`Error querying for "${query}": ${error.message}`);
    }
  }
  
  console.log('\nQuery testing completed.');
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 