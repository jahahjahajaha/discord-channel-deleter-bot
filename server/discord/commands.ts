import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Client, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { deleteChannels } from './bot';

// Define the delete-channels slash command
export const deleteChannelsCommand = {
  data: new SlashCommandBuilder()
    .setName('delete-channels')
    .setDescription('Delete all channels except for the ones you want to keep')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option =>
      option.setName('keep')
        .setDescription('Comma-separated list of channel IDs or names to keep')
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction, client: Client) {
    // Check if the user has permission to manage channels
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: 'You do not have permission to manage channels.',
        ephemeral: true
      });
      return;
    }

    // Get the guild ID
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
      return;
    }

    // Get the channels to keep
    let keepChannelIds: string[] = [];
    const keepOption = interaction.options.get('keep')?.value as string | undefined;
    
    if (keepOption) {
      // Split by comma and trim whitespace
      const channelIdentifiers = keepOption.split(',').map(id => id.trim());
      
      // Get the guild
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        await interaction.reply({
          content: 'Failed to find the server.',
          ephemeral: true
        });
        return;
      }
      
      // Fetch all channels
      const channels = await guild.channels.fetch();
      
      // Find channel IDs from names or IDs
      channelIdentifiers.forEach(identifier => {
        // Check if it's an ID
        if (channels.has(identifier)) {
          keepChannelIds.push(identifier);
        } else {
          // Check if it's a name
          const channel = channels.find(ch => ch?.name === identifier);
          if (channel) {
            keepChannelIds.push(channel.id);
          }
        }
      });
    }
    
    // Always keep the channel where the command was executed
    if (interaction.channelId && !keepChannelIds.includes(interaction.channelId)) {
      keepChannelIds.push(interaction.channelId);
    }

    try {
      // Defer the reply as this operation might take some time
      await interaction.deferReply({ ephemeral: true });
      
      // Call the deleteChannels function
      const result = await deleteChannels(guildId, keepChannelIds);
      
      if (result.success) {
        await interaction.editReply({
          content: `Successfully deleted ${result.deletedCount} channels. Failed to delete ${result.failedCount} channels.`
        });
      } else {
        await interaction.editReply({
          content: `Failed to delete channels: ${result.error}`
        });
      }
    } catch (error) {
      await interaction.editReply({
        content: `An error occurred: ${(error as Error).message}`
      });
    }
  }
};

// Register slash commands with Discord
export async function registerCommands(client: Client, token: string) {
  const commands = [deleteChannelsCommand.data.toJSON()];
  
  const rest = new REST({ version: '9' }).setToken(token);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    // Register commands globally
    if (client.application) {
      await rest.put(
        Routes.applicationCommands(client.application.id),
        { body: commands }
      );
    }
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}
