import { Client, GatewayIntentBits, Partials, ChannelType, Guild as DiscordGuild, Channel as DiscordChannel, TextChannel, VoiceChannel, CategoryChannel, Events, Collection } from "discord.js";
import { storage } from "../storage";
import { InsertGuild, InsertChannel, InsertLog } from "@shared/schema";
import { deleteChannelsCommand, deleteRolesCommand, clearMessagesCommand, registerCommands } from "./commands";

let client: Client | null = null;
let botStatus: 'offline' | 'online' | 'error' = 'offline';
let botError: string | null = null;
let userAvatarURL: string | null = null; // Store KnarliX's avatar URL

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
        
        // Fetch KnarliX's profile info to get avatar URL
        try {
          const knarlixId = '1212719184870383621';
          const user = await client!.users.fetch(knarlixId);
          userAvatarURL = user.displayAvatarURL({ size: 128 });
          console.log(`Fetched KnarliX's avatar URL: ${userAvatarURL}`);
        } catch (error) {
          console.error('Failed to fetch KnarliX avatar:', error);
          // Fallback URL in case we can't fetch it
          userAvatarURL = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
        
        // Register slash commands
        try {
          // Fix: Check if client is not null before passing
          if (client) {
            await registerCommands(client, token);
            console.log('Slash commands registered successfully!');
          }
        } catch (error) {
          console.error('Failed to register slash commands:', error);
        }
        
        // Set up interaction handler
        client!.on(Events.InteractionCreate, async (interaction) => {
          if (!interaction.isCommand()) return;
          
          // Handle commands
          if (interaction.commandName === 'delete-channels') {
            await deleteChannelsCommand.execute(interaction, client!);
          } 
          else if (interaction.commandName === 'delete-roles') {
            await deleteRolesCommand.execute(interaction, client!);
          }
          else if (interaction.commandName === 'clear') {
            await clearMessagesCommand.execute(interaction, client!);
          }
        });
        
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

// Get KnarliX's avatar URL for branded embeds
export function getKnarlixAvatarURL(): string {
  return userAvatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
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
    // Get all channels in one request
    const allChannels = await guild.channels.fetch();
    
    // Create a list of channels to delete
    const channelsToDelete: Array<[string, any]> = [];
    
    // Find channels to delete
    allChannels.forEach((channel, id) => {
      if (!channel) return;
      
      // Only delete channels of the supported types
      if (
        !keepChannelIds.includes(id) &&
        [
          ChannelType.GuildText, 
          ChannelType.GuildVoice, 
          ChannelType.GuildCategory,
          ChannelType.GuildForum,
          ChannelType.GuildAnnouncement
        ].includes(channel.type)
      ) {
        channelsToDelete.push([id, channel]);
      }
    });

    // Log the number of channels to delete
    await logAction(
      guildId, 
      'INFO', 
      `Found ${channelsToDelete.length} channels to delete out of ${allChannels.size} total channels.`
    );

    let deletedCount = 0;
    let failedCount = 0;

    // Delete channels one by one (typecasting to work around type issues)
    for (const [id, channel] of channelsToDelete) {
      try {
        // Type safety check for channel properties
        const channelName = 'name' in channel ? channel.name : `Channel ${id}`;
        
        await logAction(guildId, 'INFO', `Deleting channel: ${channelName} (${id})...`);
        await channel.delete();
        await storage.deleteChannel(id); // Remove from storage
        deletedCount++;
        await logAction(guildId, 'SUCCESS', `Deleted channel: ${channelName} (${id})`);
      } catch (error) {
        failedCount++;
        // Type safety check for channel properties
        const channelName = 'name' in channel ? channel.name : `Channel ${id}`;
        
        await logAction(
          guildId, 
          'ERROR', 
          `Failed to delete channel ${channelName} (${id}): ${(error as Error).message}`
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
    
    // Process each guild with forEach to avoid iteration type issues
    discordGuilds.forEach(async (discordGuild, id) => {
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
    });
  } catch (error) {
    console.error('Error syncing guilds to storage:', error);
  }
}

// Helper: Synchronize Discord channels to storage
async function syncChannelsToStorage(guild: DiscordGuild): Promise<void> {
  try {
    // Track IDs of channels from Discord to detect deleted ones
    const discordChannelIds = new Set<string>();
    
    console.log(`Starting to sync channels for guild ${guild.id} (${guild.name})`);
    
    // Get all channels in one request
    const allChannels = await guild.channels.fetch();
    console.log(`Fetched ${allChannels.size} channels total`);
    
    // Process all channels
    allChannels.forEach(async (discordChannel, id) => {
      if (!discordChannel) return;
      discordChannelIds.add(id);
      
      // Only save channels that we care about (text, voice, category)
      if (![
        ChannelType.GuildText, 
        ChannelType.GuildVoice, 
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildAnnouncement
      ].includes(discordChannel.type)) {
        return;
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
    });
    
    // Wait a bit for all async operations to complete
    setTimeout(async () => {
      // Find and delete channels that no longer exist in Discord
      const storedChannels = await storage.getChannelsByGuildId(guild.id);
      for (const channel of storedChannels) {
        if (!discordChannelIds.has(channel.id)) {
          await storage.deleteChannel(channel.id);
        }
      }
      
      console.log(`Finished syncing channels for guild ${guild.id} (${guild.name}). Total synced: ${discordChannelIds.size}`);
    }, 1000);
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

// Delete roles in a guild
export async function deleteRoles(
  guildId: string, 
  keepRoleIds: string[]
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
  await logAction(guildId, 'INFO', 'Starting role deletion operation...');

  try {
    // Get all roles in one request
    const allRoles = await guild.roles.fetch();
    
    // Create a list of roles to delete
    const rolesToDelete: Array<[string, any]> = [];
    
    // Find roles to delete
    allRoles.forEach((role, id) => {
      if (!role) return;
      
      // Skip if role is in keepRoleIds, or is @everyone, or is managed by an integration
      if (
        !keepRoleIds.includes(id) && 
        role.name !== '@everyone' && 
        !role.managed
      ) {
        rolesToDelete.push([id, role]);
      }
    });

    // Log the number of roles to delete
    await logAction(
      guildId, 
      'INFO', 
      `Found ${rolesToDelete.length} roles to delete out of ${allRoles.size} total roles.`
    );

    let deletedCount = 0;
    let failedCount = 0;

    // Delete roles one by one
    for (const [id, role] of rolesToDelete) {
      try {
        const roleName = role.name;
        
        await logAction(guildId, 'INFO', `Deleting role: ${roleName} (${id})...`);
        await role.delete('Deleted by Discord Channel Deleter Bot');
        deletedCount++;
        await logAction(guildId, 'SUCCESS', `Deleted role: ${roleName} (${id})`);
      } catch (error) {
        failedCount++;
        const roleName = role.name;
        
        await logAction(
          guildId, 
          'ERROR', 
          `Failed to delete role ${roleName} (${id}): ${(error as Error).message}`
        );
      }
    }

    // Final log
    const message = deletedCount > 0 
      ? `Successfully deleted ${deletedCount} roles. Failed to delete ${failedCount} roles.`
      : `No roles were deleted. Failed to delete ${failedCount} roles.`;
    
    await logAction(
      guildId, 
      deletedCount > 0 ? 'SUCCESS' : 'WARNING',
      message
    );

    return {
      success: true,
      deletedCount,
      failedCount
    };
  } catch (error) {
    await logAction(
      guildId, 
      'ERROR', 
      `Role deletion operation failed: ${(error as Error).message}`
    );

    return {
      success: false,
      error: (error as Error).message,
      deletedCount: 0,
      failedCount: 0
    };
  }
}

// Delete messages in a channel
export async function deleteMessages(
  guildId: string,
  channelId: string,
  limit: number = 100,
  olderThan?: Date,
  newerThan?: Date
): Promise<{ 
  success: boolean; 
  deletedCount: number;
  error?: string;
}> {
  if (!client || botStatus !== 'online') {
    throw new Error('Bot is not connected. Please start the bot first.');
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Guild with ID ${guildId} not found.`);
  }

  // Get the channel
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !('messages' in channel)) {
    throw new Error('Channel not found or is not a text channel.');
  }

  // Log the start of the operation
  await logAction(guildId, 'INFO', `Starting message deletion operation in channel "${channel.name}"...`);

  try {
    // Fetch messages
    const messages = await (channel as TextChannel).messages.fetch({ limit });
    
    // Filter messages by date if needed
    let messagesToDelete = messages;
    
    if (olderThan || newerThan) {
      messagesToDelete = messages.filter(msg => {
        if (olderThan && msg.createdAt >= olderThan) return false;
        if (newerThan && msg.createdAt <= newerThan) return false;
        return true;
      });
    }

    // Filter out messages older than 14 days (Discord limitation for bulk delete)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentMessages = messagesToDelete.filter(msg => msg.createdAt > twoWeeksAgo);
    const oldMessages = messagesToDelete.filter(msg => msg.createdAt <= twoWeeksAgo);
    
    await logAction(
      guildId,
      'INFO',
      `Found ${messagesToDelete.size} messages to delete. ${recentMessages.size} are recent (< 14 days old) and ${oldMessages.size} are older.`
    );

    let deletedCount = 0;

    // Delete recent messages in bulk (faster)
    if (recentMessages.size > 0) {
      try {
        await (channel as TextChannel).bulkDelete(recentMessages);
        deletedCount += recentMessages.size;
        await logAction(guildId, 'SUCCESS', `Bulk deleted ${recentMessages.size} messages in channel "${channel.name}".`);
      } catch (error) {
        await logAction(
          guildId,
          'ERROR',
          `Failed to bulk delete messages in channel "${channel.name}": ${(error as Error).message}`
        );
      }
    }

    // Delete older messages one by one (slower, but necessary for messages > 14 days)
    if (oldMessages.size > 0) {
      await logAction(
        guildId,
        'INFO',
        `Attempting to delete ${oldMessages.size} messages older than 14 days individually...`
      );

      let oldDeletedCount = 0;
      // Use Array.from to convert Collection to array for iteration
      for (const message of Array.from(oldMessages.values())) {
        try {
          await message.delete();
          oldDeletedCount++;
          
          // Log progress every 10 messages
          if (oldDeletedCount % 10 === 0 || oldDeletedCount === oldMessages.size) {
            await logAction(
              guildId,
              'INFO',
              `Deleted ${oldDeletedCount}/${oldMessages.size} older messages...`
            );
          }
        } catch (error) {
          // Skip logging individual errors to avoid spam
        }
      }
      
      deletedCount += oldDeletedCount;
      await logAction(
        guildId,
        'SUCCESS',
        `Individually deleted ${oldDeletedCount}/${oldMessages.size} older messages in channel "${channel.name}".`
      );
    }

    // Final log
    await logAction(
      guildId,
      'SUCCESS',
      `Message deletion complete. Total deleted: ${deletedCount} messages.`
    );

    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    await logAction(
      guildId,
      'ERROR',
      `Message deletion operation failed: ${(error as Error).message}`
    );

    return {
      success: false,
      error: (error as Error).message,
      deletedCount: 0
    };
  }
}
