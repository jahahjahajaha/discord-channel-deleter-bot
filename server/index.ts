import dotenv from "dotenv";
import { startBot, getBotStatus } from "./discord/bot";
import express from "express";

// Load environment variables from .env file
dotenv.config();

// Create an Express server for UptimeRobot pinging
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Ping endpoint for UptimeRobot
app.get("/", (req, res) => {
  const status = getBotStatus();
  res.send({
    botName: "Discord Channel Deleter Bot",
    status: status.status,
    uptime: process.uptime(),
    message: "Bot is running. This endpoint is for UptimeRobot monitoring."
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const status = getBotStatus();
  res.status(status.status === 'online' ? 200 : 503).send({
    status: status.status,
    error: status.error || null
  });
});

// Start the Express server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`UptimeRobot monitoring server running on port ${PORT}`);
});

(async () => {
  // Start Discord bot with token from environment
  console.log('Starting bot using token from environment...');
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!discordToken) {
    console.error('Error: DISCORD_BOT_TOKEN environment variable is not set');
    process.exit(1);
  }
  
  try {
    // Start the bot
    const startResult = await startBot(discordToken);
    
    if (!startResult.success) {
      console.error(`Failed to start bot: ${startResult.error}`);
      process.exit(1);
    }
    
    // Get bot status periodically
    setInterval(() => {
      const status = getBotStatus();
      if (status.status !== 'online') {
        console.warn(`Bot status: ${status.status}${status.error ? ` - ${status.error}` : ''}`);
      }
    }, 60000); // Check every minute
    
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
})();
