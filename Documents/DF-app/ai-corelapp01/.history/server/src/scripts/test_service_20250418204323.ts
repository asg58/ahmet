#!/usr/bin/env ts-node
/**
 * Test ChromaService
 * 
 * This script tests the ChromaService directly to query API documentation.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ChromaService } from '../chroma/chroma.service';

// Simple test module to load just what we need
class TestModule {
  static async create() {
    // Load environment variables
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    
    // Create a standalone ChromaService
    const chromaService = new ChromaService();
    
    // Initialize the service manually
    await (chromaService as any).onModuleInit();
    
    return chromaService;
  }
}

async function main() {
  console.log('Creating ChromaService...');
  const chromaService = await TestModule.create();
  
  // Test queries for CorelDRAW
  console.log('\n--- Testing CorelDRAW Queries ---');
  const corelQueries = [
    'How to create a new document in CorelDRAW?',
    'What properties are available on the Application object?'
  ];
  
  for (const query of corelQueries) {
    console.log(`\nQuery: "${query}"`);
    
    try {
      const results = await chromaService.queryApiDocumentation(query, 'coreldraw', 2);
      
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
      const results = await chromaService.queryApiDocumentation(query, 'blender', 2);
      
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