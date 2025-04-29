// Polyfills for browser-only APIs that need to work in Node.js environment

// Add crypto polyfill
import * as cryptoBrowserify from 'crypto-browserify';

// Create a proper crypto object with all required methods
const cryptoPolyfill = {
  ...cryptoBrowserify,
  // Add randomUUID method that was missing
  randomUUID: () => {
    // Simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// Replace the global crypto object
global.crypto = cryptoPolyfill;

// You can add other polyfills here if needed 