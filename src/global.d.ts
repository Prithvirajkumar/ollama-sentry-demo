// Global type declarations
declare global {
  // Node.js 18+ has fetch built-in
  var fetch: typeof import('undici').fetch;
  
  // Console is available in Node.js
  var console: Console;
}

export {};

