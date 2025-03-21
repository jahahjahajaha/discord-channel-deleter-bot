import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { 
  Client, 
  CommandInteraction, 
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonInteraction,
  GuildChannel
} from 'discord.js';
import { ChannelType } from 'discord-api-types/v10';
import { deleteChannels } from './bot';

// Define the delete-channels slash command
export const deleteChannelsCommand = {
  data: new SlashCommandBuilder()
    .setName('delete-channels')
    .setDescription('Delete all channels except for the ones you want to keep')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: CommandInteraction, client: Client) {
    // Check if the user has Administrator permission
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command. Administrator permission is required.',
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

    // Get the guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      await interaction.reply({
        content: 'Failed to find the server.',
        ephemeral: true
      });
      return;
    }

    try {
      // Fetch all channels
      const channels = await guild.channels.fetch();

      // Filter channels by type (text, voice, category, forum, announcement)
      const selectableChannels = channels.filter(channel => 
        channel !== null && 
        [
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildCategory,
          ChannelType.GuildForum,
          ChannelType.GuildAnnouncement
        ].includes(channel.type as any)
      );

      // Sort channels by type and name for better organization
      const sortedChannels = Array.from(selectableChannels.values()).sort((a, b) => {
        // First sort by type
        if ((a?.type as number) !== (b?.type as number)) {
          return (a?.type as number) - (b?.type as number);
        }
        // Then sort by name
        return a!.name.localeCompare(b!.name);
      });

      // Create an embed for the selection interface
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Channel Cleanup')
        .setDescription('Select channels to **KEEP** from the dropdown menu. All other channels will be deleted.')
        .addFields(
          { name: 'WARNING', value: 'This action cannot be undone! Be careful when selecting channels to keep.' },
          { name: 'Instructions', value: 'Select multiple channels from the dropdown menu. Current channel will be kept by default.' }
        )
        .setFooter({ text: 'Channel cleanup tool' });

      // Create action buttons
      const selectButton = new ButtonBuilder()
        .setCustomId('select-complete')
        .setLabel('Continue')
        .setStyle(ButtonStyle.Primary);
      
      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel-delete')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      // Create the action row for buttons
      const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton, selectButton);

      // Send the initial embed with a message about channel selection
      const response = await interaction.reply({
        embeds: [embed],
        components: [buttonRow],
        ephemeral: true
      });

      // Store selected channel IDs
      let selectedChannelIds: string[] = [];
      // Always include the current channel to prevent deletion of the channel where command is used
      if (interaction.channelId) {
        selectedChannelIds = [interaction.channelId];
      }

      // Create collector for component interactions
      const collector = response.createMessageComponentCollector({
        time: 300000 // 5 minutes timeout
      });

      // Handle interactions
      collector.on('collect', async (i) => {
        if (i.isButton()) {
          if (i.customId === 'cancel-delete') {
            // Cancel the operation
            const cancelEmbed = new EmbedBuilder()
              .setColor('#888888')
              .setTitle('Operation Cancelled')
              .setDescription('Channel deletion has been cancelled.')
              .setFooter({ text: 'Channel cleanup tool' });
            
            await i.update({
              embeds: [cancelEmbed],
              components: [],
            });
            
            // Stop collector
            collector.stop();
          } 
          else if (i.customId === 'select-complete') {
            // Show channel selection UI with dropdown menu
            const selectionEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('Select channels to modify')
              .setDescription('Select channels from the dropdown menu that you want to **KEEP**. All other channels will be deleted.')
              .setFooter({ text: 'You can select multiple channels from the dropdown' });
            
            // Get channels to show in dropdown
            const channelsToShow = sortedChannels.filter(channel => channel !== null);
            
            // Always ensure current channel is marked for keeping
            if (interaction.channelId && !selectedChannelIds.includes(interaction.channelId)) {
              const currentChannel = channels.get(interaction.channelId);
              if (currentChannel) {
                selectedChannelIds.push(interaction.channelId);
              }
            }
            
            // Create select menu options for channels
            const selectOptions = channelsToShow.map(channel => {
              // Get appropriate emoji for channel type
              const emoji = getChannelEmoji(channel!.type as any);
              
              return new StringSelectMenuOptionBuilder()
                .setLabel(channel!.name)
                .setDescription(getChannelTypeName(channel!.type as any))
                .setValue(channel!.id)
                .setEmoji(emoji);
            });
            
            // Create a select menu
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-channels')
              .setPlaceholder('Select channels to keep')
              .setMinValues(0)
              .setMaxValues(Math.min(25, selectOptions.length))
              .addOptions(selectOptions);
            
            // Selected channels display
            const selectedChannelsEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Currently Selected Channels')
              .setDescription(
                selectedChannelIds.length > 0
                  ? selectedChannelIds
                      .map(id => {
                        const channel = channels.get(id);
                        return channel 
                          ? `• ${getChannelEmoji(channel.type as any)} ${channel.name}` 
                          : `• Unknown channel (${id})`;
                      })
                      .join('\n')
                  : 'No channels selected yet. Select channels to keep from the dropdown menu.'
              );
            
            // Create action buttons
            const buttonRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('back-button')
                  .setLabel('Back')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('🔙'),
                new ButtonBuilder()
                  .setCustomId('confirm-selection')
                  .setLabel('Confirm Selection')
                  .setStyle(ButtonStyle.Primary)
              );
            
            // Create select row
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
            
            // Update the message with channel selection UI
            await i.update({
              embeds: [selectionEmbed, selectedChannelsEmbed],
              components: [selectRow, buttonRow],
            });
          }
          else if (i.customId === 'back-button') {
            // Go back to main menu
            await i.update({
              embeds: [embed],
              components: [buttonRow],
            });
          }
          else if (i.customId === 'confirm-selection') {
            // Show confirmation dialog
            const confirmationEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('⚠️ Final Confirmation Required ⚠️')
              .setDescription(`Are you absolutely sure you want to delete all channels except the ${selectedChannelIds.length} selected ones?`)
              .addFields(
                { 
                  name: 'Channels to Keep', 
                  value: selectedChannelIds.map(id => {
                    const channel = channels.get(id);
                    return channel ? `• ${getChannelEmoji(channel.type as any)} ${channel.name}` : `• Unknown channel (${id})`;
                  }).join('\n')
                },
                {
                  name: 'Channels to Delete',
                  value: Array.from(channels.values())
                    .filter(channel => channel && !selectedChannelIds.includes(channel.id))
                    .slice(0, 15) // Show only first 15 to prevent message being too long
                    .map(channel => `• ${getChannelEmoji(channel!.type as any)} ${channel!.name}`)
                    .join('\n') + (channels.size - selectedChannelIds.length > 15 ? '\n• ... and more' : '')
                }
              )
              .setFooter({ text: 'This action cannot be undone!' });
            
            // Create final confirmation buttons
            const finalConfirmButton = new ButtonBuilder()
              .setCustomId('final-confirm')
              .setLabel('Yes, Delete Channels')
              .setStyle(ButtonStyle.Danger);
            
            const finalCancelButton = new ButtonBuilder()
              .setCustomId('final-cancel')
              .setLabel('No, Cancel')
              .setStyle(ButtonStyle.Secondary);
            
            const finalButtonRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(finalCancelButton, finalConfirmButton);
            
            await i.update({
              embeds: [confirmationEmbed],
              components: [finalButtonRow],
            });
          }
          else if (i.customId === 'final-confirm') {
            // Execute the deletion
            await i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor('#ffa500')
                  .setTitle('Processing')
                  .setDescription('Deleting channels... Please wait.')
                  .setFooter({ text: 'Channel cleanup tool' })
              ],
              components: [],
            });
            
            try {
              // Call the deleteChannels function
              const result = await deleteChannels(guildId, selectedChannelIds);
              
              // Show results
              const resultEmbed = new EmbedBuilder()
                .setColor(result.success ? '#00ff00' : '#ff0000')
                .setTitle(result.success ? 'Operation Completed' : 'Operation Failed')
                .setDescription(
                  result.success
                    ? `Successfully deleted ${result.deletedCount} channels. Failed to delete ${result.failedCount} channels.`
                    : `Failed to delete channels: ${result.error}`
                )
                .setFooter({ text: 'Channel cleanup tool' });
              
              await i.editReply({
                embeds: [resultEmbed],
                components: [],
              });
            } catch (error) {
              // Handle errors
              const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription(`An error occurred: ${(error as Error).message}`)
                .setFooter({ text: 'Channel cleanup tool' });
              
              await i.editReply({
                embeds: [errorEmbed],
                components: [],
              });
            }
            
            // Stop collector
            collector.stop();
          }
          else if (i.customId === 'final-cancel') {
            // Cancel the operation
            const cancelEmbed = new EmbedBuilder()
              .setColor('#888888')
              .setTitle('Operation Cancelled')
              .setDescription('Channel deletion has been cancelled.')
              .setFooter({ text: 'Channel cleanup tool' });
            
            await i.update({
              embeds: [cancelEmbed],
              components: [],
            });
            
            // Stop collector
            collector.stop();
          }
        } 
        else if (i.isStringSelectMenu()) {
          if (i.customId === 'select-channels') {
            // Update selected channels
            const newSelectedChannels = i.values;
            
            // Always ensure current channel is included
            if (interaction.channelId && !newSelectedChannels.includes(interaction.channelId)) {
              newSelectedChannels.push(interaction.channelId);
            }
            
            selectedChannelIds = newSelectedChannels;
            
            // Update the selected channels display
            const updatedSelectedChannelsEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Currently Selected Channels')
              .setDescription(
                selectedChannelIds.length > 0
                  ? selectedChannelIds
                      .map(id => {
                        const channel = channels.get(id);
                        return channel 
                          ? `• ${getChannelEmoji(channel.type as any)} ${channel.name}` 
                          : `• Unknown channel (${id})`;
                      })
                      .join('\n')
                  : 'No channels selected yet. Select channels to keep from the dropdown menu.'
              );
            
            // Get the current embeds and components
            const currentEmbeds = i.message.embeds;
            currentEmbeds[1] = updatedSelectedChannelsEmbed.toJSON();
            
            // Update the message with new selected channels
            await i.update({
              embeds: currentEmbeds,
              components: i.message.components,
            });
          }
        }
      });
      
      // Handle collector end (timeout)
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // Only update if the message is still showing the selection interface
          try {
            const timeoutEmbed = new EmbedBuilder()
              .setColor('#888888')
              .setTitle('Operation Timed Out')
              .setDescription('Channel deletion has been cancelled due to inactivity.')
              .setFooter({ text: 'Channel cleanup tool' });
            
            await interaction.editReply({
              embeds: [timeoutEmbed],
              components: [],
            });
          } catch (error) {
            console.error('Failed to update message after timeout:', error);
          }
        }
      });
    } catch (error) {
      await interaction.reply({
        content: `An error occurred: ${(error as Error).message}`,
        ephemeral: true
      });
    }
  }
};

// Helper function to get emoji for channel type
function getChannelEmoji(type: number): string {
  switch (type) {
    case ChannelType.GuildText:
      return '📝';
    case ChannelType.GuildVoice:
      return '🔊';
    case ChannelType.GuildCategory:
      return '📁';
    case ChannelType.GuildForum:
      return '📊';
    case ChannelType.GuildAnnouncement:
      return '📢';
    default:
      return '❓';
  }
}

// Helper function to get readable channel type name
function getChannelTypeName(type: number): string {
  switch (type) {
    case ChannelType.GuildText:
      return 'Text Channel';
    case ChannelType.GuildVoice:
      return 'Voice Channel';
    case ChannelType.GuildCategory:
      return 'Category';
    case ChannelType.GuildForum:
      return 'Forum Channel';
    case ChannelType.GuildAnnouncement:
      return 'Announcement Channel';
    default:
      return 'Unknown Channel Type';
  }
}

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