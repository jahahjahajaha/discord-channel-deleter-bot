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

      // Create an embed for the selection interface
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Channel Cleanup')
        .setDescription('Select channels to **KEEP** from the dropdown menu below. All other channels will be deleted.')
        .addFields(
          { name: 'WARNING', value: 'This action cannot be undone! Be careful when selecting channels to keep.' },
          { name: 'Instructions', value: 'You can select multiple channels by clicking on the dropdown multiple times. When you\'re done, click the Confirm button.' }
        )
        .setFooter({ text: 'Channel cleanup tool' });

      // Create a select menu with channel options (up to 25 options)
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select-channels')
        .setPlaceholder('Select channels to keep')
        .setMinValues(1)
        .setMaxValues(Math.min(25, selectableChannels.size))
        .addOptions(
          Array.from(selectableChannels.values())
            .slice(0, 25) // Discord has a limit of 25 options in a select menu
            .map(channel => {
              let emoji = '📝'; // Default emoji for text channels
              
              // Set different emoji based on channel type
              if (channel!.type === ChannelType.GuildVoice) {
                emoji = '🔊';
              } else if (channel!.type === ChannelType.GuildCategory) {
                emoji = '📁';
              } else if (channel!.type === ChannelType.GuildForum) {
                emoji = '📊';
              } else if (channel!.type === ChannelType.GuildAnnouncement) {
                emoji = '📢';
              }
              
              return new StringSelectMenuOptionBuilder()
                .setLabel(channel!.name)
                .setDescription(`${getChannelTypeName(channel!.type as any)}`)
                .setValue(channel!.id)
                .setEmoji(emoji);
            })
        );

      // Add the current channel by default (to prevent users from deleting the channel they're using)
      const currentChannelOption = selectMenu.options.find(option => 
        option.data.value === interaction.channelId
      );
      
      if (!currentChannelOption && interaction.channelId) {
        const currentChannel = channels.get(interaction.channelId);
        if (currentChannel) {
          selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(currentChannel.name)
              .setDescription(`Current channel (can't be removed)`)
              .setValue(currentChannel.id)
              .setEmoji('📌')
              .setDefault(true)
          );
        }
      }

      // Create action buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm-delete')
        .setLabel('Confirm Deletion')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true);
      
      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel-delete')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      // Create action rows for the components
      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);
      
      const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton, confirmButton);

      // Send the initial message with components
      const response = await interaction.reply({
        embeds: [embed],
        components: [selectRow, buttonRow],
        ephemeral: true
      });

      // Store selected channel IDs
      let selectedChannelIds: string[] = [];
      if (interaction.channelId) {
        selectedChannelIds = [interaction.channelId]; // Always include current channel
      }

      // Create collectors for interactions
      const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect,
        time: 300000 // 5 minutes timeout
      });

      const buttonCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes timeout
      });

      // Handle select menu interactions
      collector.on('collect', async (i: StringSelectMenuInteraction) => {
        if (i.customId === 'select-channels') {
          // Update selected channels
          selectedChannelIds = i.values;
          
          // Always include the current channel
          if (interaction.channelId && !selectedChannelIds.includes(interaction.channelId)) {
            selectedChannelIds.push(interaction.channelId);
          }
          
          // Update embed with selected channels
          const updatedEmbed = EmbedBuilder.from(embed)
            .setFields(
              { name: 'WARNING', value: 'This action cannot be undone! Be careful when selecting channels to keep.' },
              { name: 'Instructions', value: 'You can select multiple channels by clicking on the dropdown multiple times. When you\'re done, click the Confirm button.' },
              { 
                name: 'Selected Channels to Keep', 
                value: selectedChannelIds.length > 0 
                  ? selectedChannelIds.map(id => {
                      const channel = channels.get(id);
                      return channel ? `• ${getChannelEmoji(channel.type as any)} ${channel.name}` : `• Unknown channel (${id})`;
                    }).join('\n')
                  : 'No channels selected'
              }
            );
          
          // Enable confirm button if channels are selected
          const updatedConfirmButton = ButtonBuilder.from(confirmButton)
            .setDisabled(selectedChannelIds.length === 0);
          
          const updatedButtonRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(cancelButton, updatedConfirmButton);
          
          // Update the message
          await i.update({
            embeds: [updatedEmbed],
            components: [selectRow, updatedButtonRow],
          });
        }
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
          collector.stop();
          buttonCollector.stop();
        } 
        else if (i.customId === 'confirm-delete') {
          // Confirm deletion - show confirmation dialog
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
          
          // Stop collectors
          collector.stop();
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
          collector.stop();
          buttonCollector.stop();
        }
      });

      // Handle collector end
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // Timed out
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('Operation Timed Out')
            .setDescription('Channel deletion has been cancelled due to inactivity.')
            .setFooter({ text: 'Channel cleanup tool' });
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
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
