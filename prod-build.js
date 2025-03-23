#!/usr/bin/env node

/**
 * This is a specialized build script for production deployment on Render.com
 * It skips the Vite frontend build entirely and only compiles the server code
 * This avoids the "Could not resolve entry module 'client/index.html'" error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Set environment variables
process.env.NODE_ENV = 'production';

console.log('📦 Starting production build for Render.com...');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}
if (!fs.existsSync('dist/public')) {
  fs.mkdirSync('dist/public');
}

// Create a minimal index.html in the dist/public directory
const minimalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord Channel Deleter Bot - API Server</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { color: #5865F2; }
    .card { background: #f9f9f9; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; border: 1px solid #e0e0e0; }
    .info { background: #e3f2fd; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: monospace; }
    .button { display: inline-block; background: #5865F2; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .button:hover { background: #4752c4; }
  </style>
</head>
<body>
  <h1>Discord Channel Deleter Bot</h1>
  <div class="card">
    <h2>Bot Status</h2>
    <p>This is the API server for Discord Channel Deleter Bot.</p>
    <div class="info">
      <p>Check bot status at: <code>/api/ping</code> or <code>/health</code></p>
    </div>
    <p>The Discord bot should be running if this page is accessible.</p>
    <a href="https://github.com/KnarliX/discord-channel-deleter-bot" class="button">GitHub Repository</a>
  </div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', minimalHtml);
console.log('✅ Created minimal index.html for API server');

// Build only the server
try {
  console.log('🔨 Building server code...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { 
    stdio: 'inherit' 
  });
  console.log('✅ Server build successful');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Create a small file to indicate this was built with our custom script
fs.writeFileSync('dist/built-with-prod-script.txt', `Built on: ${new Date().toISOString()}\nSkipped Vite frontend build\n`);

console.log('✅ Production build completed successfully');