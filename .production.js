// This file is used by Render.com when deploying the application in production mode
// It loads the compiled server code directly instead of using Vite

import('./dist/index.js').catch(err => {
  console.error('❌ Failed to start production server:', err);
  process.exit(1);
});