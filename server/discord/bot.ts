import { Client, GatewayIntentBits, Partials, ChannelType, Guild as DiscordGuild, Channel as DiscordChannel, TextChannel, VoiceChannel, CategoryChannel } from "discord.js";
import { storage } from "../storage";
import { InsertGuild, InsertChannel, InsertLog } from "@shared/schema";

let client: Client | null = null;
let botStatus: 'offline' | 'online' | 'error' = 'offline';
let botError: string | null = null;

// Initialize the Discord bot with the provided token
export async function startBot(token: string): Promise<{ success: boolean; status: string; error?: string }> {
  // If client already exists, disconnect it first
  if (client) {
    try {
      await client.destroy();
    } catch (error) {
      console.error('Error destroying existing client:', error);
    }
    client = null;
  }

  // Create a new client instance
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
  });

  return new Promise((resolve) => {
    try {
      // Set up event handlers
      client!.once('ready', async () => {
        botStatus = 'online';
        botError = null;
        
        // Log bot startup
        console.log(`Logged in as ${client!.user!.tag}!`);
        
        // Cache guild data
        await syncGuildsToStorage();
        
        resolve({
          success: true,
          status: 'online',
        });
      });

      // Handle errors
      client!.on('error', (error) => {
        console.error('Discord client error:', error);
        botStatus = 'error';
        botError = error.message;
        
        resolve({
          success: false,
          status: 'error',
          error: error.message
        });
      });

      // Login to Discord with the token
      client!.login(token).catch((error) => {
        botStatus = 'error';
        botError = error.message;
        
        resolve({
          success: false,
          status: 'error',
          error: error.message
        });
      });
    } catch (error) {
      botStatus = 'error';
      botError = (error as Error).message;
      
      resolve({
        success: false,
        status: 'error',
        error: (error as Error).message
      });
    }
  });
}

// Get the current status of the Discord bot
export function getBotStatus(): { status: string; error?: string } {
  return {
    status: botStatus,
    ...(botError ? { error: botError } : {})
  };
}

// Fetch and return all guilds the bot is a member of
export async function getGuilds(): Promise<any[]> {
  if (!client || botStatus !== 'online') {
    throw new Error('Bot is not connected. Please start the bot first.');
  }

  // Sync the guilds to storage first
  await syncGuildsToStorage();
  
  // Return guilds from storage
  const guilds = await storage.getAllGuilds();
  return guilds;
}

// Fetch and return all channels in a guild
export async function getChannels(guildId: string): Promise<any[]> {
  if (!client || botStatus !== 'online') {
    throw new Error('Bot is not connected. Please start the bot first.');
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Guild with ID ${guildId} not found.`);
  }

  // Sync channels to storage
  await syncChannelsToStorage(guild);

  // Return channels from storage
  const channels = await storage.getChannelsByGuildId(guildId);
  return channels;
}

// Delete channels except for the ones to keep
export async function deleteChannels(
  guildId: string, 
  keepChannelIds: string[]
): Promise<{ 
  success: boolean; 
  deletedCount: number; 
  failedCount: number;
  error?: string;
}> {
  if (!client || botStatus !== 'online') {
    throw new Error('Bot is not connected. Please start the bot first.');
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Guild with ID ${guildId} not found.`);
  }

  // Log the start of the operation
  await logAction(guildId, 'INFO', 'Starting channel deletion operation...');

  try {
    // Fetch all channels in the guild
    const channels = await guild.channels.fetch();
    
    // Filter out the channels to keep
    const channelsToDelete = channels.filter(channel => 
      channel !== null && 
      !keepChannelIds.includes(channel.id) &&
      // Check if the channel can be deleted (text, voice, or category)
      [
        ChannelType.GuildText, 
        ChannelType.GuildVoice, 
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildAnnouncement
      ].includes(channel.type)
    );

    // Log the number of channels to delete
    await logAction(
      guildId, 
      'INFO', 
      `Found ${channelsToDelete.size} channels to delete out of ${channels.size} total channels.`
    );

    let deletedCount = 0;
    let failedCount = 0;

    // Delete channels one by one
    for (const [id, channel] of channelsToDelete) {
      try {
        await logAction(guildId, 'INFO', `Deleting channel: ${channel.name} (${id})...`);
        await channel.delete();
        await storage.deleteChannel(id); // Remove from storage
        deletedCount++;
        await logAction(guildId, 'SUCCESS', `Deleted channel: ${channel.name} (${id})`);
      } catch (error) {
        failedCount++;
        await logAction(
          guildId, 
          'ERROR', 
          `Failed to delete channel ${channel.name} (${id}): ${(error as Error).message}`
        );
      }
    }

    // Final log
    const message = deletedCount > 0 
      ? `Successfully deleted ${deletedCount} channels. Failed to delete ${failedCount} channels.`
      : `No channels were deleted. Failed to delete ${failedCount} channels.`;
    
    await logAction(
      guildId, 
      deletedCount > 0 ? 'SUCCESS' : 'WARNING',
      message
    );

    // Sync channels to storage again to update the state
    await syncChannelsToStorage(guild);

    return {
      success: true,
      deletedCount,
      failedCount
    };
  } catch (error) {
    await logAction(
      guildId, 
      'ERROR', 
      `Channel deletion operation failed: ${(error as Error).message}`
    );

    return {
      success: false,
      error: (error as Error).message,
      deletedCount: 0,
      failedCount: 0
    };
  }
}

// Helper: Synchronize Discord guilds to storage
async function syncGuildsToStorage(): Promise<void> {
  if (!client) return;

  try {
    // Get all guilds from Discord API
    const discordGuilds = client.guilds.cache;
    
    for (const [id, discordGuild] of discordGuilds) {
      // Check if guild already exists in storage
      const existingGuild = await storage.getGuild(id);
      
      if (!existingGuild) {
        // Create new guild in storage
        const guildData: InsertGuild = {
          id: discordGuild.id,
          name: discordGuild.name,
          icon: discordGuild.icon || null,
          ownerId: discordGuild.ownerId
        };
        
        await storage.createGuild(guildData);
        
        // Also sync channels for this guild
        await syncChannelsToStorage(discordGuild);
      } else {
        // Update guild if needed
        if (
          existingGuild.name !== discordGuild.name ||
          existingGuild.icon !== discordGuild.icon ||
          existingGuild.ownerId !== discordGuild.ownerId
        ) {
          await storage.updateGuild(id, {
            name: discordGuild.name,
            icon: discordGuild.icon || null,
            ownerId: discordGuild.ownerId
          });
        }
      }
    }
  } catch (error) {
    console.error('Error syncing guilds to storage:', error);
  }
}

// Helper: Synchronize Discord channels to storage
async function syncChannelsToStorage(guild: DiscordGuild): Promise<void> {
  try {
    // Get all channels from Discord API for this guild
    const discordChannels = await guild.channels.fetch();
    
    // Track IDs of channels from Discord to detect deleted ones
    const discordChannelIds = new Set<string>();
    
    for (const [id, discordChannel] of discordChannels) {
      if (!discordChannel) continue;
      discordChannelIds.add(id);
      
      // Only save channels that we care about (text, voice, category)
      if (![
        ChannelType.GuildText, 
        ChannelType.GuildVoice, 
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildAnnouncement
      ].includes(discordChannel.type)) {
        continue;
      }
      
      // Check if channel already exists in storage
      const existingChannel = await storage.getChannel(id);
      
      if (!existingChannel) {
        // Create new channel in storage
        const channelData: InsertChannel = {
          id: discordChannel.id,
          guildId: guild.id,
          name: discordChannel.name,
          type: discordChannel.type,
          position: discordChannel.position,
          parentId: discordChannel.parentId || null
        };
        
        await storage.createChannel(channelData);
      } else {
        // Update channel if needed
        if (
          existingChannel.name !== discordChannel.name ||
          existingChannel.type !== discordChannel.type ||
          existingChannel.position !== discordChannel.position ||
          existingChannel.parentId !== (discordChannel.parentId || null)
        ) {
          await storage.updateChannel(id, {
            name: discordChannel.name,
            type: discordChannel.type,
            position: discordChannel.position,
            parentId: discordChannel.parentId || null
          });
        }
      }
    }
    
    // Find and delete channels that no longer exist in Discord
    const storedChannels = await storage.getChannelsByGuildId(guild.id);
    for (const channel of storedChannels) {
      if (!discordChannelIds.has(channel.id)) {
        await storage.deleteChannel(channel.id);
      }
    }
  } catch (error) {
    console.error(`Error syncing channels for guild ${guild.id} to storage:`, error);
  }
}

// Helper: Log an action to storage
async function logAction(guildId: string, type: string, message: string): Promise<void> {
  try {
    const logData: InsertLog = {
      guildId,
      type,
      message
    };
    
    await storage.createLog(logData);
    console.log(`[${type}] ${message}`);
  } catch (error) {
    console.error('Error logging action:', error);
  }
}
