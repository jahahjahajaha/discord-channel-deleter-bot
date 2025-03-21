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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
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
        .setDescription('Select channels to **KEEP** by checking the boxes. All other channels will be deleted.')
        .addFields(
          { name: 'WARNING', value: 'This action cannot be undone! Be careful when selecting channels to keep.' },
          { name: 'Instructions', value: 'Check the boxes next to the channels you want to keep. When you\'re done, click the Select button.' }
        )
        .setFooter({ text: 'Channel cleanup tool' });

      // Create action buttons
      const selectButton = new ButtonBuilder()
        .setCustomId('select-complete')
        .setLabel('Select')
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

      // Create collector for button interactions
      const buttonCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes timeout
      });

      // Handle button interactions
      buttonCollector.on('collect', async (i: ButtonInteraction) => {
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
          
          // Stop collectors
          buttonCollector.stop();
        } 
        else if (i.customId === 'select-complete') {
          // Show channel selection UI similar to the screenshot
          const selectionEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Select channels to modify')
            .setDescription('Check the boxes next to the channels you want to keep. All other channels will be deleted.')
            .setFooter({ text: 'Click "Select" when done' });
          
          // Create action rows with buttons representing channels
          const channelRows: ActionRowBuilder<ButtonBuilder>[] = [];
          const channelsToShow = sortedChannels.slice(0, 25); // Discord UI limitation
          
          // Create rows of channel buttons
          for (let i = 0; i < channelsToShow.length; i++) {
            const channel = channelsToShow[i];
            if (!channel) continue;
            
            // Check if this is the current channel
            const isCurrentChannel = channel.id === interaction.channelId;
            // Check if channel is already selected
            const isSelected = selectedChannelIds.includes(channel.id);
            
            // Get appropriate emoji for channel type
            const emoji = getChannelEmoji(channel.type as any);
            
            // Create button for this channel
            const channelButton = new ButtonBuilder()
              .setCustomId(`channel-${channel.id}`)
              .setLabel(`${channel.name}`)
              .setEmoji(isSelected || isCurrentChannel ? '✅' : emoji)
              .setStyle(isSelected || isCurrentChannel ? ButtonStyle.Success : ButtonStyle.Secondary);
            
            // Add button to appropriate row
            const rowIndex = Math.floor(i / 5);
            if (!channelRows[rowIndex]) {
              channelRows[rowIndex] = new ActionRowBuilder<ButtonBuilder>();
            }
            
            channelRows[rowIndex].addComponents(channelButton);
          }
          
          // Add confirmation button
          const confirmRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('back-button')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔙'),
              new ButtonBuilder()
                .setCustomId('confirm-selection')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Primary)
            );
          
          // Add components to overall message
          const allComponents = [...channelRows, confirmRow];
          
          // Update the message with channel selection UI
          await i.update({
            embeds: [selectionEmbed],
            components: allComponents,
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
        else if (i.customId.startsWith('channel-')) {
          // Channel selection button clicked
          const channelId = i.customId.replace('channel-', '');
          
          // Toggle selection (except for current channel which must be kept)
          if (channelId !== interaction.channelId) {
            if (selectedChannelIds.includes(channelId)) {
              // Remove from selected
              selectedChannelIds = selectedChannelIds.filter(id => id !== channelId);
            } else {
              // Add to selected
              selectedChannelIds.push(channelId);
            }
          }
          
          // Reconstruct the UI with updated selections
          // This is necessary because Discord doesn't allow updating individual buttons
          
          // Get the channel buttons from current components
          const channelComponents = i.message.components.slice(0, -1); // Exclude the last confirm row
          const confirmRow = i.message.components[i.message.components.length - 1];
          
          // Create updated button rows
          const updatedRows: ActionRowBuilder<ButtonBuilder>[] = [];
          
          // Process each existing row
          for (let rowIndex = 0; rowIndex < channelComponents.length; rowIndex++) {
            const row = channelComponents[rowIndex];
            const updatedRow = new ActionRowBuilder<ButtonBuilder>();
            
            // Update each button in the row
            for (const button of row.components) {
              if (button.type === ComponentType.Button) {
                const buttonId = button.customId as string;
                
                if (buttonId.startsWith('channel-')) {
                  const buttonChannelId = buttonId.replace('channel-', '');
                  const channel = channels.get(buttonChannelId);
                  
                  if (channel) {
                    // Check if selected or current channel
                    const isCurrentChannel = buttonChannelId === interaction.channelId;
                    const isSelected = selectedChannelIds.includes(buttonChannelId);
                    
                    // Get appropriate emoji
                    const emoji = getChannelEmoji(channel.type as any);
                    
                    // Create updated button
                    updatedRow.addComponents(
                      new ButtonBuilder()
                        .setCustomId(buttonId)
                        .setLabel(channel.name)
                        .setEmoji(isSelected || isCurrentChannel ? '✅' : emoji)
                        .setStyle(isSelected || isCurrentChannel ? ButtonStyle.Success : ButtonStyle.Secondary)
                    );
                  }
                }
              }
            }
            
            updatedRows.push(updatedRow);
          }
          
          // Add the confirm row back
          const updatedConfirmRow = ActionRowBuilder.from(confirmRow as any);
          
          // Update the message with the new button states
          await i.update({
            components: [...updatedRows, updatedConfirmRow] as any,
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
          
          // Stop collectors
          buttonCollector.stop();
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
          
          // Stop collectors
          buttonCollector.stop();
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