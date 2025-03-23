// Simple build script for Render.com deployment
const { execSync } = require('child_process');

// Set environment variables for production
process.env.NODE_ENV = 'production';
process.env.SKIP_FRONTEND_BUILD = 'true';

// Only build the server-side code, skip the Vite frontend build
console.log('Building server-side code for Discord bot...');

try {
  // Create the dist directory if it doesn't exist
  execSync('mkdir -p dist', { stdio: 'inherit' });
  
  // Copy the production indicator file
  execSync('cp .production.js dist/production.js', { stdio: 'inherit' });
  
  // Build only the server code
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}