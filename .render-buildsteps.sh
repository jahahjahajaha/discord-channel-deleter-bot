#!/bin/bash

# This script runs during the Render.com build process
# It replaces the default build command with our custom build

echo "=== Starting Render.com Discord Bot Build ==="

# Check if we're on Render
if [ -n "$RENDER" ]; then
  echo "☁️ Running on Render.com, using custom build process"
  
  # Skip Vite frontend build entirely
  echo "🔧 Using custom build steps for Discord bot deployment"
  
  # Make sure prod-build.js is executable
  chmod +x prod-build.js
  
  # Run our specialized production build script
  node prod-build.js
  
  echo "✅ Custom build completed successfully!"
  exit 0
else
  echo "🖥️ Not running on Render.com, using standard build process"
  npm run build
fi