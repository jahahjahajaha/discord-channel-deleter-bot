import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { 
  Client, 
  CommandInteraction,
  ChatInputCommandInteraction,
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
  GuildChannel,
  Collection
} from 'discord.js';
import { ChannelType } from 'discord-api-types/v10';
import { deleteChannels, deleteRoles, deleteMessages, getKnarlixAvatarURL } from './bot';

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
        );
      
      addBrandedFooter(embed);

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
      
      // For channel type filtering and pagination
      let currentPage = 0;
      let currentFilter = 'all'; // Default to showing all channel types

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
              .setDescription('Channel deletion has been cancelled.');
            
            addBrandedFooter(cancelEmbed);
            
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
              .setDescription('Select channels from the dropdown menu that you want to **KEEP**. All other channels will be deleted.');
              
            addBrandedFooter(selectionEmbed);
            
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
            const allSelectOptions = channelsToShow.map(channel => {
              // Get appropriate emoji for channel type
              const emoji = getChannelEmoji(channel!.type as any);
              
              return new StringSelectMenuOptionBuilder()
                .setLabel(channel!.name)
                .setDescription(getChannelTypeName(channel!.type as any))
                .setValue(channel!.id)
                .setEmoji(emoji);
            });
            
            // Handle pagination for large servers
            // Discord limits select menus to 25 options, so we need to paginate
            // Take only the first 25 options for now
            const selectOptions = allSelectOptions.slice(0, 25);
            
            // Create a select menu
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-channels')
              .setPlaceholder(`Select channels to keep (1-25 of ${allSelectOptions.length})`)
              .setMinValues(0)
              .setMaxValues(25)
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
            
            // Create navigation buttons for pagination
            let navigationRow = new ActionRowBuilder<ButtonBuilder>();
            
            // Only show navigation buttons if there are more than 25 channels
            if (allSelectOptions.length > 25) {
                navigationRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev-page')
                        .setLabel('Previous Page')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                        .setDisabled(true), // Disabled on first page
                    new ButtonBuilder()
                        .setCustomId('next-page')
                        .setLabel('Next Page')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('➡️')
                );
            }
            
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
            
            // Create type filter menu
            const typeFilterMenu = new StringSelectMenuBuilder()
              .setCustomId('filter-type')
              .setPlaceholder('Filter by channel type')
              .addOptions([
                new StringSelectMenuOptionBuilder()
                  .setLabel('All Channels')
                  .setValue('all')
                  .setDescription('Show all channel types')
                  .setDefault(currentFilter === 'all'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Text Channels')
                  .setValue('text')
                  .setEmoji('📝')
                  .setDescription('Show only text channels')
                  .setDefault(currentFilter === 'text'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Voice Channels')
                  .setValue('voice')
                  .setEmoji('🔊')
                  .setDescription('Show only voice channels')
                  .setDefault(currentFilter === 'voice'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Categories')
                  .setValue('category')
                  .setEmoji('📁')
                  .setDescription('Show only categories')
                  .setDefault(currentFilter === 'category'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Announcement Channels')
                  .setValue('announcement')
                  .setEmoji('📢')
                  .setDescription('Show only announcement channels')
                  .setDefault(currentFilter === 'announcement'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Forum Channels')
                  .setValue('forum')
                  .setEmoji('📊')
                  .setDescription('Show only forum channels')
                  .setDefault(currentFilter === 'forum')
              ]);
              
            // Create type filter row
            const typeFilterRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(typeFilterMenu);
            
            // Create select row
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
            
            // Update the message with channel selection UI and add pagination if needed
            const components = allSelectOptions.length > 25 
                ? [typeFilterRow, selectRow, navigationRow, buttonRow] 
                : [typeFilterRow, selectRow, buttonRow];
                
            await i.update({
              embeds: [selectionEmbed, selectedChannelsEmbed],
              components: components,
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
              );
              
              addBrandedFooter(confirmationEmbed);
            
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
                (() => {
                  const processingEmbed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('Processing')
                    .setDescription('Deleting channels... Please wait.');
                  return addBrandedFooter(processingEmbed);
                })()
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
                );
                
              addBrandedFooter(resultEmbed);
              
              await i.editReply({
                embeds: [resultEmbed],
                components: [],
              });
            } catch (error) {
              // Handle errors
              const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription(`An error occurred: ${(error as Error).message}`);
                
              addBrandedFooter(errorEmbed);
              
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
              .setDescription('Channel deletion has been cancelled.');
              
            addBrandedFooter(cancelEmbed);
            
            await i.update({
              embeds: [cancelEmbed],
              components: [],
            });
            
            // Stop collector
            collector.stop();
          }
          else if (i.customId === 'next-page' || i.customId === 'prev-page') {
            // Handle pagination for channel selection
            if (i.customId === 'next-page') {
              currentPage++;
            } else if (i.customId === 'prev-page') {
              currentPage--;
            }
            
            // Get channels to show in dropdown
            const channelsToShow = sortedChannels.filter(channel => channel !== null);
            
            // Create all options
            const allSelectOptions = channelsToShow.map(channel => {
              const emoji = getChannelEmoji(channel!.type as any);
              return new StringSelectMenuOptionBuilder()
                .setLabel(channel!.name)
                .setDescription(getChannelTypeName(channel!.type as any))
                .setValue(channel!.id)
                .setEmoji(emoji);
            });
            
            // Calculate page bounds
            const pageSize = 25;
            const totalPages = Math.ceil(allSelectOptions.length / pageSize);
            const startIdx = currentPage * pageSize;
            const endIdx = Math.min(startIdx + pageSize, allSelectOptions.length);
            
            // Get options for current page
            const pageOptions = allSelectOptions.slice(startIdx, endIdx);
            
            // Create select menu with current page options
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-channels')
              .setPlaceholder(`Select channels (${startIdx + 1}-${endIdx} of ${allSelectOptions.length})`)
              .setMinValues(0)
              .setMaxValues(pageOptions.length)
              .addOptions(pageOptions);
            
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
            
            // Create navigation buttons
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev-page')
                  .setLabel('Previous Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('⬅️')
                  .setDisabled(currentPage === 0),
                new ButtonBuilder()
                  .setCustomId('next-page')
                  .setLabel('Next Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('➡️')
                  .setDisabled(currentPage === totalPages - 1)
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
            
            // Create updated selected channels embed to maintain selection across pages
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
              
            // Get the main embed from existing message
            const mainEmbed = i.message.embeds[0];
              
            // Create new embeds array with both embeds
            const updatedEmbeds = [
              new EmbedBuilder()
                .setColor(mainEmbed.color || '#0099ff')
                .setTitle(mainEmbed.title || 'Select channels to modify')
                .setDescription(mainEmbed.description || 'Select channels from the dropdown menu that you want to KEEP. All other channels will be deleted.'),
              updatedSelectedChannelsEmbed
            ];
            
            // Add branded footer
            addBrandedFooter(updatedEmbeds[0]);
            
            // Update the UI with new page and maintain selection display
            await i.update({
              embeds: updatedEmbeds,
              components: [selectRow, navigationRow, buttonRow],
            });
          }
        } 
        else if (i.isStringSelectMenu()) {
          if (i.customId === 'select-channels') {
            // Get current values without losing previously selected channels
            const currentValues = i.values;
            
            // We need to merge with existing selections to make it accumulative
            // First, get already selected channels
            const existingSelections = [...selectedChannelIds];
            
            // For each currently selected channel
            for (const channelId of currentValues) {
              // If it's not already in our selections, add it
              if (!existingSelections.includes(channelId)) {
                existingSelections.push(channelId);
              }
            }
            
            // Always ensure current channel is included
            if (interaction.channelId && !existingSelections.includes(interaction.channelId)) {
              existingSelections.push(interaction.channelId);
            }
            
            // Update our selections with merged list
            selectedChannelIds = existingSelections;
            
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
            // Instead of modifying embeds directly, recreate them
            const mainEmbed = i.message.embeds[0];
            
            // Create a new message with updated embeds
            const updatedEmbeds = [
              new EmbedBuilder()
                .setColor(mainEmbed.color || '#0099ff')
                .setTitle(mainEmbed.title || 'Select channels to modify')
                .setDescription(mainEmbed.description || 'Select channels from the dropdown menu that you want to KEEP. All other channels will be deleted.'),
              updatedSelectedChannelsEmbed
            ];
            
            // Add footers to embeds
            addBrandedFooter(updatedEmbeds[0]);
            
            // Update the message with new selected channels
            await i.update({
              embeds: updatedEmbeds,
              components: i.message.components,
            });
          }
          else if (i.customId === 'filter-type') {
            // Handle channel type filtering
            currentFilter = i.values[0];
            currentPage = 0; // Reset to first page when changing filter
            
            // Get the filtered channels
            const channelsToShow = sortedChannels.filter(channel => {
              if (currentFilter === 'all') return true;
              if (currentFilter === 'text' && channel!.type === ChannelType.GuildText) return true;
              if (currentFilter === 'voice' && channel!.type === ChannelType.GuildVoice) return true;
              if (currentFilter === 'category' && channel!.type === ChannelType.GuildCategory) return true;
              if (currentFilter === 'announcement' && channel!.type === ChannelType.GuildAnnouncement) return true;
              if (currentFilter === 'forum' && channel!.type === ChannelType.GuildForum) return true;
              return false;
            });
            
            // Create options for the filtered channels
            const filteredOptions = channelsToShow.map(channel => {
              const emoji = getChannelEmoji(channel!.type as any);
              return new StringSelectMenuOptionBuilder()
                .setLabel(channel!.name)
                .setDescription(getChannelTypeName(channel!.type as any))
                .setValue(channel!.id)
                .setEmoji(emoji);
            });
            
            // Calculate page bounds
            const pageSize = 25;
            const totalPages = Math.ceil(filteredOptions.length / pageSize);
            const startIdx = currentPage * pageSize;
            const endIdx = Math.min(startIdx + pageSize, filteredOptions.length);
            
            // Get options for current page
            const pageOptions = filteredOptions.slice(startIdx, endIdx);
            
            // Create type filter menu
            const typeFilterMenu = new StringSelectMenuBuilder()
              .setCustomId('filter-type')
              .setPlaceholder('Filter by channel type')
              .addOptions([
                new StringSelectMenuOptionBuilder()
                  .setLabel('All Channels')
                  .setValue('all')
                  .setDescription('Show all channel types')
                  .setDefault(currentFilter === 'all'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Text Channels')
                  .setValue('text')
                  .setEmoji('📝')
                  .setDescription('Show only text channels')
                  .setDefault(currentFilter === 'text'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Voice Channels')
                  .setValue('voice')
                  .setEmoji('🔊')
                  .setDescription('Show only voice channels')
                  .setDefault(currentFilter === 'voice'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Categories')
                  .setValue('category')
                  .setEmoji('📁')
                  .setDescription('Show only categories')
                  .setDefault(currentFilter === 'category'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Announcement Channels')
                  .setValue('announcement')
                  .setEmoji('📢')
                  .setDescription('Show only announcement channels')
                  .setDefault(currentFilter === 'announcement'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Forum Channels')
                  .setValue('forum')
                  .setEmoji('📊')
                  .setDescription('Show only forum channels')
                  .setDefault(currentFilter === 'forum')
              ]);
              
            // Create channel selection menu
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-channels')
              .setPlaceholder(`Select channels (${startIdx + 1}-${endIdx} of ${filteredOptions.length})`)
              .setMinValues(0)
              .setMaxValues(pageOptions.length);
              
            // Add options to the select menu
            if (pageOptions.length > 0) {
              selectMenu.addOptions(pageOptions);
            } else {
              // If no channels of this type, show a placeholder and disable the menu
              selectMenu
                .addOptions([
                  new StringSelectMenuOptionBuilder()
                    .setLabel('No channels of this type')
                    .setValue('none')
                    .setDescription('Try a different filter')
                ])
                .setDisabled(true); // Disable the entire menu not just the option
            }
              
            const typeFilterRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(typeFilterMenu);
              
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
              
            // Create navigation buttons
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev-page')
                  .setLabel('Previous Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('⬅️')
                  .setDisabled(currentPage === 0),
                new ButtonBuilder()
                  .setCustomId('next-page')
                  .setLabel('Next Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('➡️')
                  .setDisabled(currentPage === totalPages - 1 || totalPages === 0)
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
              
            // Update selected channels display
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
              
            // Get the main embed from existing message
            const mainEmbed = i.message.embeds[0];
              
            // Create embeds 
            const updatedEmbeds = [
              new EmbedBuilder()
                .setColor(mainEmbed.color || '#0099ff')
                .setTitle(mainEmbed.title || 'Select channels to modify')
                .setDescription(`Filter: ${getFilterName(currentFilter)}. Select channels you want to **KEEP**. All other channels will be deleted.`),
              selectedChannelsEmbed
            ];
            
            // Add branded footer
            addBrandedFooter(updatedEmbeds[0]);
            
            // Only show navigation if we have multiple pages
            const components = filteredOptions.length > pageSize
              ? [typeFilterRow, selectRow, navigationRow, buttonRow]
              : [typeFilterRow, selectRow, buttonRow];
            
            // Update the UI with filtered channels
            await i.update({
              embeds: updatedEmbeds,
              components: components,
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
              .setDescription('Channel deletion has been cancelled due to inactivity.');
              
            addBrandedFooter(timeoutEmbed);
            
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
      console.error('Error in delete-channels command:', error);
      
      try {
        // Check if we can reply to the interaction
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `An error occurred: ${(error as Error).message}`,
            ephemeral: true
          });
        } else {
          // If we already replied, try to follow up
          await interaction.followUp({
            content: `An error occurred: ${(error as Error).message}`,
            ephemeral: true
          });
        }
      } catch (followUpError) {
        // If we can't reply or follow up, just log the error
        console.error('Failed to send error message:', followUpError);
      }
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

// Helper function to get readable filter name
function getFilterName(filter: string): string {
  switch (filter) {
    case 'all': return 'All Channels';
    case 'text': return 'Text Channels';
    case 'voice': return 'Voice Channels';
    case 'category': return 'Categories';
    case 'announcement': return 'Announcement Channels';
    case 'forum': return 'Forum Channels';
    case 'high': return 'High Priority Roles';
    case 'medium': return 'Medium Priority Roles';
    case 'low': return 'Low Priority Roles';
    case 'hoisted': return 'Displayed Separately Roles';
    case 'color': return 'Colored Roles';
    default: return 'All Channels';
  }
}

// Define the delete-roles slash command
export const deleteRolesCommand = {
  data: new SlashCommandBuilder()
    .setName('delete-roles')
    .setDescription('Delete all roles except for the ones you want to keep')
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
      // Fetch all roles
      const roles = await guild.roles.fetch();

      // Filter out @everyone role and managed roles (bot roles, integration roles)
      const selectableRoles = roles.filter(role => 
        role !== null && 
        role.name !== '@everyone' &&
        !role.managed
      );

      // Sort roles by position (higher position first, as it's more important)
      const sortedRoles = Array.from(selectableRoles.values()).sort((a, b) => {
        return b.position - a.position;
      });

      // Create an embed for the selection interface
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Role Cleanup')
        .setDescription('Select roles to **KEEP** from the dropdown menu. All other roles will be deleted.')
        .addFields(
          { name: 'WARNING', value: 'This action cannot be undone! Be careful when selecting roles to keep.' },
          { name: 'Instructions', value: 'Select multiple roles from the dropdown menu.' }
        );
      
      addBrandedFooter(embed);

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

      // Send the initial embed
      const response = await interaction.reply({
        embeds: [embed],
        components: [buttonRow],
        ephemeral: true
      });

      // Store selected role IDs and pagination variables
      let selectedRoleIds: string[] = [];
      let currentPage = 0; // Track the current page for pagination
      let currentFilter = 'all'; // Default to showing all role types
      
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
              .setDescription('Role deletion has been cancelled.');
            
            addBrandedFooter(cancelEmbed);
            
            await i.update({
              embeds: [cancelEmbed],
              components: [],
            });
            
            // Stop collector
            collector.stop();
          } 
          else if (i.customId === 'select-complete') {
            // Show role selection UI with dropdown menu
            const selectionEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('Select roles to keep')
              .setDescription('Select roles from the dropdown menu that you want to **KEEP**. All other roles will be deleted.');
              
            addBrandedFooter(selectionEmbed);
            
            // Create select menu options for roles
            const allSelectOptions = sortedRoles.map(role => {
              // Ensure role name is not empty (Discord.js validation requires non-empty strings)
              const roleName = role.name.trim() || `Role (ID: ${role.id})`;
              return new StringSelectMenuOptionBuilder()
                .setLabel(roleName)
                .setDescription(`Position: ${role.position}`)
                .setValue(role.id)
                .setEmoji('🏷️');
            });
            
            // Handle pagination for large servers
            // Discord limits select menus to 25 options, so we need to paginate
            const pageSize = 25;
            const totalPages = Math.ceil(allSelectOptions.length / pageSize);
            const startIdx = currentPage * pageSize;
            const endIdx = Math.min(startIdx + pageSize, allSelectOptions.length);
            
            // Get options for current page
            const pageOptions = allSelectOptions.slice(startIdx, endIdx);
            
            // Create a select menu
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-roles')
              .setPlaceholder(`Select roles to keep (${startIdx + 1}-${endIdx} of ${allSelectOptions.length})`)
              .setMinValues(0)
              .setMaxValues(pageOptions.length)
              .addOptions(pageOptions);
            
            // Selected roles display
            const selectedRolesEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Currently Selected Roles')
              .setDescription(
                selectedRoleIds.length > 0
                  ? selectedRoleIds
                      .map(id => {
                        const role = roles.get(id);
                        return role 
                          ? `• 🏷️ ${role.name}` 
                          : `• Unknown role (${id})`;
                      })
                      .join('\n')
                  : 'No roles selected yet. Select roles to keep from the dropdown menu.'
              );
            
            // Create navigation buttons for pagination
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev-page')
                  .setLabel('Previous Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('⬅️')
                  .setDisabled(currentPage === 0), // Disabled on first page
                new ButtonBuilder()
                  .setCustomId('next-page')
                  .setLabel('Next Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('➡️')
                  .setDisabled(currentPage === totalPages - 1 || totalPages === 0)
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
            
            // Create type filter menu
            const typeFilterMenu = new StringSelectMenuBuilder()
              .setCustomId('filter-type')
              .setPlaceholder('Filter by role priority')
              .addOptions([
                new StringSelectMenuOptionBuilder()
                  .setLabel('All Roles')
                  .setValue('all')
                  .setDescription('Show all roles')
                  .setDefault(currentFilter === 'all'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('High Priority Roles')
                  .setValue('high')
                  .setEmoji('🔝')
                  .setDescription('Show only high priority roles (position > 15)')
                  .setDefault(currentFilter === 'high'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Medium Priority Roles')
                  .setValue('medium')
                  .setEmoji('⏺️')
                  .setDescription('Show only medium priority roles (position 5-15)')
                  .setDefault(currentFilter === 'medium'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Low Priority Roles')
                  .setValue('low')
                  .setEmoji('⏬')
                  .setDescription('Show only low priority roles (position < 5)')
                  .setDefault(currentFilter === 'low'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Displayed Separately')
                  .setValue('hoisted')
                  .setEmoji('📌')
                  .setDescription('Show only roles displayed separately in member list')
                  .setDefault(currentFilter === 'hoisted'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Colored Roles')
                  .setValue('color')
                  .setEmoji('🎨')
                  .setDescription('Show only roles with custom colors')
                  .setDefault(currentFilter === 'color')
              ]);
            
            // Create filter row
            const typeFilterRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(typeFilterMenu);
              
            // Create select row
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
            
            // Update the message with role selection UI and add pagination if needed
            const components = allSelectOptions.length > 25 
                ? [typeFilterRow, selectRow, navigationRow, buttonRow] 
                : [typeFilterRow, selectRow, buttonRow];
                
            await i.update({
              embeds: [selectionEmbed, selectedRolesEmbed],
              components: components,
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
              .setDescription(`Are you absolutely sure you want to delete all roles except the ${selectedRoleIds.length} selected ones?`)
              .addFields(
                { 
                  name: 'Roles to Keep', 
                  value: selectedRoleIds.map(id => {
                    const role = roles.get(id);
                    return role ? `• 🏷️ ${role.name}` : `• Unknown role (${id})`;
                  }).join('\n') || 'None selected - all roles will be deleted!'
                },
                {
                  name: 'Roles to Delete',
                  value: Array.from(roles.values())
                    .filter(role => 
                      role && 
                      !selectedRoleIds.includes(role.id) && 
                      role.name !== '@everyone' && 
                      !role.managed
                    )
                    .slice(0, 15) // Show only first 15 to prevent message being too long
                    .map(role => `• 🏷️ ${role.name}`)
                    .join('\n') + (roles.size - selectedRoleIds.length - 1 > 15 ? '\n• ... and more' : '') // -1 for @everyone
                }
              );
              
              addBrandedFooter(confirmationEmbed);
            
            // Create final confirmation buttons
            const finalConfirmButton = new ButtonBuilder()
              .setCustomId('final-confirm')
              .setLabel('Yes, Delete Roles')
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
                (() => {
                  const processingEmbed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('Processing')
                    .setDescription('Deleting roles... Please wait.');
                  return addBrandedFooter(processingEmbed);
                })()
              ],
              components: [],
            });
            
            try {
              // Call the deleteRoles function
              const result = await deleteRoles(guildId, selectedRoleIds);
              
              // Show results
              const resultEmbed = new EmbedBuilder()
                .setColor(result.success ? '#00ff00' : '#ff0000')
                .setTitle(result.success ? 'Operation Completed' : 'Operation Failed')
                .setDescription(
                  result.success
                    ? `Successfully deleted ${result.deletedCount} roles. Failed to delete ${result.failedCount} roles.`
                    : `Failed to delete roles: ${result.error}`
                );
                
              addBrandedFooter(resultEmbed);
              
              await i.editReply({
                embeds: [resultEmbed],
                components: [],
              });
            } catch (error) {
              // Handle errors
              const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription(`An error occurred: ${(error as Error).message}`);
                
              addBrandedFooter(errorEmbed);
              
              await i.editReply({
                embeds: [errorEmbed],
                components: [],
              });
            }
          }
          else if (i.customId === 'final-cancel') {
            // Cancel the deletion
            const cancelEmbed = new EmbedBuilder()
              .setColor('#888888')
              .setTitle('Operation Cancelled')
              .setDescription('Role deletion has been cancelled.');
            
            addBrandedFooter(cancelEmbed);
            
            await i.update({
              embeds: [cancelEmbed],
              components: [],
            });
            
            // Stop collector
            collector.stop();
          }
          else if (i.customId === 'next-page' || i.customId === 'prev-page') {
            // Handle pagination for role selection
            if (i.customId === 'next-page') {
              currentPage++;
            } else if (i.customId === 'prev-page') {
              currentPage--;
            }
            
            // Create all select menu options
            const allSelectOptions = sortedRoles.map(role => {
              // Ensure role name is not empty (Discord.js validation requires non-empty strings)
              const roleName = role.name.trim() || `Role (ID: ${role.id})`;
              return new StringSelectMenuOptionBuilder()
                .setLabel(roleName)
                .setDescription(`Position: ${role.position}`)
                .setValue(role.id)
                .setEmoji('🏷️');
            });
            
            // Calculate page info
            const pageSize = 25;
            const totalPages = Math.ceil(allSelectOptions.length / pageSize);
            const startIdx = currentPage * pageSize;
            const endIdx = Math.min(startIdx + pageSize, allSelectOptions.length);
            
            // Get options for current page
            const pageOptions = allSelectOptions.slice(startIdx, endIdx);
            
            // Create a select menu with current page options
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-roles')
              .setPlaceholder(`Select roles to keep (${startIdx + 1}-${endIdx} of ${allSelectOptions.length}, ${selectedRoleIds.length} selected)`)
              .setMinValues(0)
              .setMaxValues(pageOptions.length)
              .addOptions(pageOptions);
            
            // Create navigation buttons with appropriate disabled state
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev-page')
                  .setLabel('Previous Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('⬅️')
                  .setDisabled(currentPage === 0),
                new ButtonBuilder()
                  .setCustomId('next-page')
                  .setLabel('Next Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('➡️')
                  .setDisabled(currentPage === totalPages - 1 || totalPages === 0)
              );
            
            // Create select row
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
            
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
            
            // Update selected roles display
            const selectedRolesEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Currently Selected Roles')
              .setDescription(
                selectedRoleIds.length > 0
                  ? selectedRoleIds
                      .map(id => {
                        const role = roles.get(id);
                        return role 
                          ? `• 🏷️ ${role.name}` 
                          : `• Unknown role (${id})`;
                      })
                      .join('\n')
                  : 'No roles selected yet. Select roles to keep from the dropdown menu.'
              );
            
            // Get the main embed from existing message
            const mainEmbed = i.message.embeds[0];
            
            // Create embeds
            const updatedEmbeds = [
              new EmbedBuilder()
                .setColor(mainEmbed.color || '#0099ff')
                .setTitle(mainEmbed.title || 'Select roles to keep')
                .setDescription(mainEmbed.description || 'Select roles from the dropdown menu that you want to KEEP. All other roles will be deleted.'),
              selectedRolesEmbed
            ];
            
            // Add branded footer
            addBrandedFooter(updatedEmbeds[0]);
            
            // Get the type filter menu
            const typeFilterMenu = new StringSelectMenuBuilder()
              .setCustomId('filter-type')
              .setPlaceholder('Filter by role priority')
              .addOptions([
                new StringSelectMenuOptionBuilder()
                  .setLabel('All Roles')
                  .setValue('all')
                  .setDescription('Show all roles')
                  .setDefault(currentFilter === 'all'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('High Priority Roles')
                  .setValue('high')
                  .setEmoji('🔝')
                  .setDescription('Show only high priority roles (position > 15)')
                  .setDefault(currentFilter === 'high'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Medium Priority Roles')
                  .setValue('medium')
                  .setEmoji('⏺️')
                  .setDescription('Show only medium priority roles (position 5-15)')
                  .setDefault(currentFilter === 'medium'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Low Priority Roles')
                  .setValue('low')
                  .setEmoji('⏬')
                  .setDescription('Show only low priority roles (position < 5)')
                  .setDefault(currentFilter === 'low'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Displayed Separately')
                  .setValue('hoisted')
                  .setEmoji('📌')
                  .setDescription('Show only roles displayed separately in member list')
                  .setDefault(currentFilter === 'hoisted'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Colored Roles')
                  .setValue('color')
                  .setEmoji('🎨')
                  .setDescription('Show only roles with custom colors')
                  .setDefault(currentFilter === 'color')
              ]);
            
            const typeFilterRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(typeFilterMenu);
            
            // Update the UI with new page
            await i.update({
              embeds: updatedEmbeds,
              components: [typeFilterRow, selectRow, navigationRow, buttonRow],
            });
          }
        }
        else if (i.isStringSelectMenu()) {
          if (i.customId === 'select-roles') {
            // Update selected roles - merge with previous selections instead of replacing
            // Create a Set to avoid duplicates
            const roleIdsSet = new Set([...selectedRoleIds]);
            
            // Add new selections if not already selected, or remove if already selected
            i.values.forEach(id => {
              if (roleIdsSet.has(id)) {
                roleIdsSet.delete(id); // Unselect if already selected
              } else {
                roleIdsSet.add(id); // Select if not already selected
              }
            });
            
            // Update the selectedRoleIds array
            selectedRoleIds = Array.from(roleIdsSet);
            
            // Get current embeds and components
            const currentComponents = Array.from(i.message.components);
            
            // Update the selected roles embed
            const selectedRolesEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Currently Selected Roles')
              .setDescription(
                selectedRoleIds.length > 0
                  ? selectedRoleIds
                      .map(id => {
                        const role = roles.get(id);
                        return role 
                          ? `• 🏷️ ${role.name}` 
                          : `• Unknown role (${id})`;
                      })
                      .join('\n')
                  : 'No roles selected yet. Select roles to keep from the dropdown menu.'
              );
            
            // Keep main embed, update selected roles embed
            await i.update({
              embeds: [i.message.embeds[0], selectedRolesEmbed],
              components: currentComponents,
            });
          }
          else if (i.customId === 'filter-type') {
            // Handle role filtering
            currentFilter = i.values[0];
            currentPage = 0; // Reset page when changing filter
            
            // Get the filtered roles
            const filteredRoles = sortedRoles.filter(role => {
              if (currentFilter === 'all') return true;
              if (currentFilter === 'high' && role.position > 15) return true;
              if (currentFilter === 'medium' && role.position >= 5 && role.position <= 15) return true;
              if (currentFilter === 'low' && role.position < 5) return true;
              if (currentFilter === 'hoisted' && role.hoist) return true;
              if (currentFilter === 'color' && role.color !== 0) return true;
              return false;
            });
            
            // Create options for the filtered roles
            const filteredOptions = filteredRoles.map(role => {
              // Ensure role name is not empty (Discord.js validation requires non-empty strings)
              const roleName = role.name.trim() || `Role (ID: ${role.id})`;
              return new StringSelectMenuOptionBuilder()
                .setLabel(roleName)
                .setDescription(`Position: ${role.position}`)
                .setValue(role.id)
                .setEmoji('🏷️');
            });
            
            // Calculate page bounds
            const pageSize = 25;
            const totalPages = Math.ceil(filteredOptions.length / pageSize);
            const startIdx = currentPage * pageSize;
            const endIdx = Math.min(startIdx + pageSize, filteredOptions.length);
            
            // Get options for current page
            const pageOptions = filteredOptions.slice(startIdx, endIdx);
            
            // Create type filter menu
            const typeFilterMenu = new StringSelectMenuBuilder()
              .setCustomId('filter-type')
              .setPlaceholder('Filter by role priority')
              .addOptions([
                new StringSelectMenuOptionBuilder()
                  .setLabel('All Roles')
                  .setValue('all')
                  .setDescription('Show all roles')
                  .setDefault(currentFilter === 'all'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('High Priority Roles')
                  .setValue('high')
                  .setEmoji('🔝')
                  .setDescription('Show only high priority roles (position > 15)')
                  .setDefault(currentFilter === 'high'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Medium Priority Roles')
                  .setValue('medium')
                  .setEmoji('⏺️')
                  .setDescription('Show only medium priority roles (position 5-15)')
                  .setDefault(currentFilter === 'medium'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Low Priority Roles')
                  .setValue('low')
                  .setEmoji('⏬')
                  .setDescription('Show only low priority roles (position < 5)')
                  .setDefault(currentFilter === 'low'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Displayed Separately')
                  .setValue('hoisted')
                  .setEmoji('📌')
                  .setDescription('Show only roles displayed separately in member list')
                  .setDefault(currentFilter === 'hoisted'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Colored Roles')
                  .setValue('color')
                  .setEmoji('🎨')
                  .setDescription('Show only roles with custom colors')
                  .setDefault(currentFilter === 'color')
              ]);
            
            // Create channel selection menu
            let selectMenu = new StringSelectMenuBuilder()
              .setCustomId('select-roles')
              .setPlaceholder(`Select roles (${startIdx + 1}-${endIdx} of ${filteredOptions.length}, ${selectedRoleIds.length} selected)`)
              .setMinValues(0)
              .setMaxValues(pageOptions.length);
              
            // Add options to the select menu
            if (pageOptions.length > 0) {
              selectMenu.addOptions(pageOptions);
            } else {
              // If no roles of this type, show a placeholder and disable the menu
              selectMenu
                .addOptions([
                  new StringSelectMenuOptionBuilder()
                    .setLabel('No roles of this type')
                    .setValue('none')
                    .setDescription('Try a different filter')
                ])
                .setDisabled(true);
            }
              
            const typeFilterRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(typeFilterMenu);
              
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
              .addComponents(selectMenu);
              
            // Create navigation buttons
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev-page')
                  .setLabel('Previous Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('⬅️')
                  .setDisabled(currentPage === 0),
                new ButtonBuilder()
                  .setCustomId('next-page')
                  .setLabel('Next Page')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('➡️')
                  .setDisabled(currentPage === totalPages - 1 || totalPages === 0)
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
              
            // Update selected roles display
            const selectedRolesEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Currently Selected Roles')
              .setDescription(
                selectedRoleIds.length > 0
                  ? selectedRoleIds
                      .map(id => {
                        const role = roles.get(id);
                        return role 
                          ? `• 🏷️ ${role.name}` 
                          : `• Unknown role (${id})`;
                      })
                      .join('\n')
                  : 'No roles selected yet. Select roles to keep from the dropdown menu.'
              );
            
            // Create UI embeds
            const updatedEmbeds = [
              new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Select roles to keep')
                .setDescription(`Filter: ${getFilterName(currentFilter)}. Select roles you want to **KEEP**. All other roles will be deleted.`),
              selectedRolesEmbed
            ];
            
            // Add branded footer
            addBrandedFooter(updatedEmbeds[0]);
            
            // Only show navigation if we have multiple pages
            const components = filteredOptions.length > pageSize
              ? [typeFilterRow, selectRow, navigationRow, buttonRow]
              : [typeFilterRow, selectRow, buttonRow];
            
            // Update the UI with filtered roles
            await i.update({
              embeds: updatedEmbeds,
              components: components,
            });
          }
        }
      });
      
      // Handle collector end event
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // If collector ends due to timeout
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('Operation Timed Out')
            .setDescription('Role deletion has been cancelled due to inactivity.');
          
          addBrandedFooter(timeoutEmbed);
          
          try {
            await interaction.editReply({
              embeds: [timeoutEmbed],
              components: [],
            });
          } catch (error) {
            // Silently fail if we can't update the message
          }
        }
      });
    } catch (error) {
      console.error('Error in delete-roles command:', error);
      
      try {
        // Check if we can reply to the interaction
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `An error occurred: ${(error as Error).message}`,
            ephemeral: true
          });
        } else {
          // If we already replied, try to follow up
          await interaction.followUp({
            content: `An error occurred: ${(error as Error).message}`,
            ephemeral: true
          });
        }
      } catch (followUpError) {
        // If we can't reply or follow up, just log the error
        console.error('Failed to send error message:', followUpError);
      }
    }
  }
};

// Define the clear-messages slash command
export const clearMessagesCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete multiple messages from a channel at once')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => 
      option
        .setName('amount')
        .setDescription('Number of messages to delete (max 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type of messages to delete')
        .setRequired(false)
        .addChoices(
          { name: 'All Messages', value: 'all' },
          { name: 'User Messages Only', value: 'user' },
          { name: 'Bot Messages Only', value: 'bot' },
          { name: 'Except System Messages', value: 'non-system' }
        )
    )
    .addUserOption(option =>
      option
        .setName('from')
        .setDescription('Delete messages only from this user')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('include_pinned')
        .setDescription('Include pinned messages in deletion')
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction, client: Client) {
    // Check if the user has ManageMessages permission
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: 'You do not have permission to use this command. Manage Messages permission is required.',
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

    // Get the channel ID
    const channelId = interaction.channelId;
    if (!channelId) {
      await interaction.reply({
        content: 'Failed to determine the channel.',
        ephemeral: true
      });
      return;
    }

    try {
      // Get the options
      const options = interaction as ChatInputCommandInteraction;
      const amount = options.options.getInteger('amount', true);
      const messageType = options.options.getString('type') as 'all' | 'user' | 'bot' | 'non-system' || 'all';
      const userOption = options.options.getUser('from');
      const userId = userOption?.id;
      const includePinned = options.options.getBoolean('include_pinned') ?? false;
      
      // Construct confirmation message based on filters
      let confirmationMessage = `Processing... Deleting ${amount} messages`;
      
      if (messageType && messageType !== 'all') {
        if (messageType === 'bot') {
          confirmationMessage += ` (bot messages only)`;
        } else if (messageType === 'user') {
          confirmationMessage += ` (user messages only)`;
        } else if (messageType === 'non-system') {
          confirmationMessage += ` (excluding system messages)`;
        }
      }
      
      if (userId) {
        confirmationMessage += ` from user ${userOption?.tag || userId}`;
      }
      
      if (!includePinned) {
        confirmationMessage += ` (excluding pinned messages)`;
      }
      
      confirmationMessage += '.';
      
      // Show processing message
      await interaction.reply({
        content: confirmationMessage,
        ephemeral: true
      });
      
      // Call the deleteMessages function with filters
      const result = await deleteMessages(
        guildId, 
        channelId, 
        amount, 
        messageType, 
        userId,
        undefined,
        undefined,
        includePinned
      );
      
      // Build result message with filter details
      let resultMessage = result.success 
        ? `Successfully deleted ${result.deletedCount} messages` 
        : `Failed to delete messages: ${result.error}`;
        
      if (messageType && messageType !== 'all') {
        if (messageType === 'bot') {
          resultMessage += ` (bot messages only)`;
        } else if (messageType === 'user') {
          resultMessage += ` (user messages only)`;
        } else if (messageType === 'non-system') {
          resultMessage += ` (excluding system messages)`;
        }
      }
      
      if (userId) {
        resultMessage += ` from user ${userOption?.tag || userId}`;
      }
      
      if (!includePinned) {
        resultMessage += ` (pinned messages were preserved)`;
      }
      
      if (result.success) {
        await interaction.editReply({
          content: resultMessage + '.',
        });
      } else {
        await interaction.editReply({
          content: resultMessage,
        });
      }
    } catch (error) {
      console.error('Error in clear-messages command:', error);
      
      try {
        // Handle the error with better error handling
        if (interaction.replied) {
          // Try to edit our earlier reply
          await interaction.editReply({
            content: `An error occurred: ${(error as Error).message}`,
          });
        } else if (!interaction.replied && !interaction.deferred) {
          // Try to send a new reply
          await interaction.reply({
            content: `An error occurred: ${(error as Error).message}`,
            ephemeral: true
          });
        } else {
          // Try to follow up if we can't reply or edit
          await interaction.followUp({
            content: `An error occurred: ${(error as Error).message}`,
            ephemeral: true
          });
        }
      } catch (followUpError) {
        // If we can't communicate with the interaction at all, just log it
        console.error('Failed to send error message:', followUpError);
      }
    }
  }
};

// Helper function to add branded footer to embeds
function addBrandedFooter(embed: EmbedBuilder): EmbedBuilder {
  return embed.setFooter({
    text: 'Discord Channel Deleter Bot | Created by KnarliX | <@1212719184870383621>',
    iconURL: getKnarlixAvatarURL()
  });
}

// Register slash commands with Discord
export async function registerCommands(client: Client, token: string) {
  const commands = [
    deleteChannelsCommand.data.toJSON(),
    deleteRolesCommand.data.toJSON(),
    clearMessagesCommand.data.toJSON()
  ];
  
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