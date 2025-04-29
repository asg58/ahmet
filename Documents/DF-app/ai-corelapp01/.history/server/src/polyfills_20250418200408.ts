// Polyfills for browser-only APIs that need to work in Node.js environment

// Add crypto polyfill
import * as cryptoBrowserify from 'crypto-browserify';
global.crypto = cryptoBrowserify;

// You can add other polyfills here if needed 