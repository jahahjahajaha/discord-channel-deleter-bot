// This file is used for Render.com deployment
// It skips the frontend build and only builds the server code that is necessary for the Discord bot

// Set an environment variable to indicate we're in production
process.env.NODE_ENV = 'production';

// In this setup, we only need the server to run, not the frontend
console.log('Starting Discord bot in production mode...');