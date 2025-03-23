#!/usr/bin/env node

/**
 * This is a wrapper script that calls our specialized prod-build.js
 * It helps maintain compatibility with Render.com deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

console.log(`Running build in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

if (isProduction || process.env.SKIP_FRONTEND_BUILD) {
  console.log('Using specialized production build script (prod-build.js)');
  
  // Check if prod-build.js exists
  if (fs.existsSync(path.join(__dirname, 'prod-build.js'))) {
    try {
      // Make sure it's executable
      execSync('chmod +x prod-build.js', { stdio: 'inherit' });
      // Call our specialized production build script
      execSync('node prod-build.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run prod-build.js:', error);
      process.exit(1);
    }
  } else {
    console.error('ERROR: prod-build.js not found!');
    process.exit(1);
  }
} else {
  console.log('Running standard build process');
  try {
    // Run the standard build command from package.json
    execSync('npm run build:frontend && npm run build:server', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error('Standard build failed:', error);
    process.exit(1);
  }
}