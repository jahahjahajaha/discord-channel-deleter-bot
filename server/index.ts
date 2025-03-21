import dotenv from "dotenv";
import { startBot, getBotStatus } from "./discord/bot";

// Load environment variables from .env file
dotenv.config();

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
