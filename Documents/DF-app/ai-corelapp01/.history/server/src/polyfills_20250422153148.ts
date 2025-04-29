// Polyfills for browser-only APIs that need to work in Node.js environment

// Add crypto polyfill
import * as cryptoBrowserify from 'crypto-browserify';

// Check if crypto already exists and create or extend it properly
if (!global.crypto) {
  // Create a crypto object if it doesn't exist
  global.crypto = {} as Crypto;
}

// Add missing methods safely
if (!global.crypto.randomUUID) {
  // Add randomUUID method that was missing
  global.crypto.randomUUID = () => {
    // Simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Add any other polyfills here if needed 