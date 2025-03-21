# <img src="https://cdn.discordapp.com/avatars/1212719184870383621/01726c13f9319b0f58cd3e472f122e53.webp?size=128" width="30" alt="Bot Icon"> KnarliX Channel Manager

A powerful Discord bot that revolutionizes channel management for server administrators, providing an efficient solution for organizing and cleaning up Discord servers. 

[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

- **🗑️ Bulk Channel Deletion**: Select which channels to keep and delete the rest in one operation
- **📋 Multi-Type Support**: Works with all channel types including text, voice, and categories
- **🔄 Persistent Selections**: Channel selections are saved per server and persist between navigation
- **📱 Responsive Design**: Works on desktop and mobile devices
- **👥 Administrator Only**: Commands are restricted to users with administrator permissions
- **🚀 Fast Performance**: Optimized for quick operations even on large servers
- **📊 Activity Logs**: Detailed operation logs to track all channel management activities
- **🌈 Intuitive UI**: User-friendly interface with clear visual indicators

## 📸 Screenshots

![Server Selection](https://cdn.discordapp.com/avatars/1212719184870383621/01726c13f9319b0f58cd3e472f122e53.webp?size=128)
![Channel Management](https://cdn.discordapp.com/avatars/1212719184870383621/01726c13f9319b0f58cd3e472f122e53.webp?size=128)

## 🛠️ Technology Stack

| Frontend | Backend | Tools |
|----------|---------|-------|
| React | Node.js | Git |
| TypeScript | Express | npm |
| Tailwind CSS | Discord.js | Vite |
| Tanstack Query | Drizzle ORM | ESLint |
| Shadcn UI | PostgreSQL | TypeScript |

## 📋 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- A Discord account with a registered application and bot

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/knarlix-discord-bot.git
cd knarlix-discord-bot
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
Create a `.env` file in the project root with:
```
DISCORD_BOT_TOKEN="your_discord_bot_token_here"
```

### Step 4: Start the Application
```bash
npm run dev
```

## 📚 Usage Guide

### Adding the Bot to Your Server

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application and navigate to the "OAuth2" tab
3. Under "Scopes" select "bot" and under "Bot Permissions" select:
   - Manage Channels
   - Read Messages/View Channels
   - Send Messages
4. Copy the generated URL and open it in your browser to add the bot to your server

### Using the Bot Commands

The bot provides a slash command:

- `/delete-channels` - Opens an interactive interface to select channels to keep, while all unselected channels will be deleted

## 🔒 Security

- The bot only requires the minimum necessary permissions to function
- All operations are logged and can be audited
- Only server administrators can use destructive commands

## 🚀 Deployment

This project can be deployed on any Node.js hosting platform:

1. **Replit**: Click the "Deploy" button to automatically deploy to Replit
2. **Heroku**: Use the Procfile included for easy Heroku deployment
3. **Docker**: A Dockerfile is included for containerized deployment

## 🙋 FAQ

### Is the bot free to use?
Yes, the bot is completely free and open source.

### Can I customize the bot?
Absolutely! The code is open-source and can be modified to suit your needs.

### How many channels can the bot manage?
The bot is designed to handle servers with hundreds of channels efficiently.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

Developed with ❤️ by [KnarliX](https://discord.com/users/1212719184870383621)

Special thanks to all the contributors who have helped improve this project!