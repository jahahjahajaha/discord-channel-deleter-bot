# KnarliX Discord Bot

A Discord bot that revolutionizes channel management for server administrators, providing powerful and intuitive tools for efficient content cleanup.

## Features

- **Bulk Channel Management**: Select and delete multiple channels at once while keeping selected channels.
- **Pagination Support**: Works with large servers (97+ channels) with intuitive navigation.
- **Permission Controls**: Restricts command usage to administrators only.
- **Dynamic Branding**: Automatically fetches and displays KnarliX's current profile picture in all embeds.
- **User-Friendly Interface**: Clear visual indicators for channel selection and management.

## Technologies Used

- Discord.js
- TypeScript
- Express.js
- React
- Vite

## Setup Instructions

1. Clone this repository
2. Install dependencies with `npm install`
3. Create a `.env` file with your Discord bot token:
   ```
   DISCORD_BOT_TOKEN="your_token_here"
   ```
4. Start the application with `npm run dev`

## Commands

- `/deletechannels` - Opens an interactive menu to select channels to keep. All other channels will be deleted.

## Credits

Created by [KnarliX](https://discord.com/users/1212719184870383621)