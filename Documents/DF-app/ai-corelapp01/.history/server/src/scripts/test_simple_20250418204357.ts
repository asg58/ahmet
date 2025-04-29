#!/usr/bin/env ts-node
/**
 * Test Simple ChromaDB Access
 * 
 * This script tests basic access to ChromaDB and lists all documents.
 */

import { ChromaClient } from 'chromadb';

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
  
  // List collections
  try {
    const collections = await client.listCollections();
    console.log(`\nCollections in ChromaDB: ${collections.length}`);
    collections.forEach((col: any, i: number) => {
      console.log(`  ${i+1}. ${col.name}`);
    });
  } catch (error) {
    console.error(`Error listing collections: ${error.message}`);
    process.exit(1);
  }
  
  // Trying to get the API documentation collection
  try {
    console.log('\nGetting api_documentation collection...');
    const collection = await client.getCollection({
      name: 'api_documentation',
      embeddingFunction: null
    });
    
    // Get collection count
    const count = await collection.count();
    console.log(`Total documents in collection: ${count}`);
    
    // Get all documents
    if (count > 0) {
      console.log('\nRetrieving documents...');
      
      // Try to get all documents (might not work with embeddings required)
      try {
        const result = await collection.get();
        console.log(`Retrieved ${result.ids.length} document IDs`);
        console.log('Document IDs:', result.ids);
        console.log('\nDocument Metadata:');
        
        for (let i = 0; i < result.metadatas.length; i++) {
          console.log(`\nDocument ${i+1}:`);
          console.log(`  ID: ${result.ids[i]}`);
          console.log(`  Metadata: ${JSON.stringify(result.metadatas[i], null, 2)}`);
          console.log(`  Content: ${result.documents[i].substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`Error retrieving documents: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`Error accessing collection: ${error.message}`);
  }
  
  console.log('\nTest completed.');
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 