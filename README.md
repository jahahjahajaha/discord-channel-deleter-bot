# <img src="logo.svg" width="30" alt="Bot Icon"> Discord Channel Deleter Bot

<div align="center">
  <img src="logo.svg" width="200" alt="Discord Channel Deleter Bot Logo">
  <br>
  <h2>Discord Channel Deleter Bot</h2>
  <p>A powerful Discord bot that revolutionizes channel management for server administrators, providing an efficient solution for organizing and cleaning up Discord servers.</p>
  <br>
  
  [![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/license-MIT-22c55e.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
  
  <br>
  <img src="attached_assets/Screenshot_20250321-131946.png" width="80%" alt="Bot Interface">
  <br><br>
  <p>
    <b>Designed & Developed by</b>
    <br>
    <a href="https://github.com/KnarliX">
      <img src="https://raw.githubusercontent.com/KnarliX/My-pfp/refs/heads/main/pfp.png" width="100" style="border-radius:50%" alt="KnarliX">
    </a>
    <br>
    <b>KnarliX</b>
  </p>
</div>

## ✨ Features

### Key Features

- 🗑️ **Bulk Channel Deletion** - Select which channels to keep and delete the rest in one operation, perfect for server cleanup
- 👑 **Role Cleanup** - Select which roles to keep and delete all others to streamline server permissions
- ✏️ **Message Clearing** - Quickly clear up to 100 messages at once from any channel with proper permission checks
- 📋 **Multi-Type Support** - Works with all channel types including text, voice, categories, forums, and announcements
- 🔄 **Persistent Selections** - Selections are saved as you work and persist between navigation
- 📱 **Mobile Compatible** - Works perfectly on Discord mobile - manage your server from anywhere
- 👥 **Administrator Only** - Commands are restricted to users with administrator permissions for security
- 🚀 **Optimized Performance** - Fast operations even on servers with hundreds of channels or roles
- 📊 **Activity Logging** - Detailed operation logs to track all management activities
- 🌈 **Intuitive UI** - User-friendly interface with clear visual indicators and filtering options

## 📸 Screenshots

<div align="center">
  <img src="attached_assets/Screenshot_20250321-131930.png" width="45%" alt="Channel Filter Selection">
  <img src="attached_assets/Screenshot_20250321-131946.png" width="45%" alt="Channel Selection">
  <br><br>
  <img src="attached_assets/Screenshot_20250321-132022.png" width="45%" alt="Confirmation Screen">
  <img src="attached_assets/Screenshot_20250321-132035.png" width="45%" alt="Deletion Progress">
</div>

## 🛠️ Technology Stack

| Backend | Tools |
|---------|-------|
| Node.js | Git |
| TypeScript | npm |
| Express | ESLint |
| Discord.js | TypeScript |
| Drizzle ORM | |

## 📋 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- A Discord account with a registered application and bot

### Step 1: Clone the Repository
```bash
git clone https://github.com/knarlix/discord-channel-deleter-bot.git
cd discord-channel-deleter-bot
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
   - Manage Roles
   - Read Messages/View Channels
   - Send Messages
   - Manage Messages
4. Copy the generated URL and open it in your browser to add the bot to your server

### Using the Bot Commands

The bot provides the following slash commands:

- `/delete-channels` - Opens an interactive interface to select channels to keep, while all unselected channels will be deleted
- `/delete-roles` - Opens an interactive interface to select roles to keep, while all unselected roles will be deleted
- `/clear` - Clears recent messages from a channel with customizable filters for older/newer messages

## 🔒 Security

- The bot only requires the minimum necessary permissions to function
- All operations are logged and can be audited
- Only server administrators can use destructive commands

## 🚀 Deployment

This project can be deployed on any Node.js hosting platform:

1. **Replit**: Use Replit to host your bot 24/7 (recommended with UptimeRobot for continuous uptime)
2. **Railway**: Deploy with one-click using the Railway platform
3. **VPS/Dedicated Server**: Host on any server running Node.js

### Setting Up UptimeRobot for 24/7 Uptime

To keep your bot running 24/7 on free hosting platforms like Replit, follow these steps:

1. **Create an UptimeRobot Account**:
   - Go to [UptimeRobot](https://uptimerobot.com) and sign up for a free account

2. **Add a New Monitor**:
   - Click "Add New Monitor"
   - Select "HTTP(s)" as the monitor type
   - Enter a friendly name like "Discord Channel Deleter Bot"
   - Enter your bot's URL (e.g., `https://your-replit-project.username.repl.co`)
   - Set the monitoring interval to 5 minutes
   - Click "Create Monitor"

3. **Verify Setup**:
   - The bot now has a dedicated HTTP endpoint at the root URL (`/`) that responds to UptimeRobot's pings
   - A health check endpoint is available at `/health` for detailed status monitoring
   - UptimeRobot will ping your bot at regular intervals, preventing it from going into sleep mode

This setup ensures your bot remains online even when using free hosting services that normally sleep after periods of inactivity.

## 🌐 Website

A companion website for the bot is available in the root directory. You can host it on GitHub Pages:

1. Fork this repository
2. Go to repository Settings → Pages
3. Set the source to "main" branch and folder to "/"
4. Your website will be available at `https://yourusername.github.io/discord-channel-deleter-bot`

The website provides detailed information about the bot, usage instructions, and setup guides.

## 📂 GitHub Repository Setup

To push your code to GitHub:

1. **Create a GitHub Repository**:
   - Go to [GitHub](https://github.com) and log in
   - Click "New repository" and name it `discord-channel-deleter-bot`
   - Keep it public or private based on your preference
   - Do not initialize with README, .gitignore, or license (we already have these)

2. **Initialize Git and Push (First Time)**:
   ```bash
   # Make sure you're in the project directory
   git init
   git add .
   git commit -m "Initial commit: Discord Channel Deleter Bot"
   git branch -M main
   git remote add origin https://github.com/yourusername/discord-channel-deleter-bot.git
   git push -u origin main
   ```

3. **For Subsequent Updates**:
   ```bash
   git add .
   git commit -m "Your update message here"
   git push
   ```

4. **Files to Exclude**:
   - The `.gitignore` file already excludes:
     - `node_modules/`
     - `.env` (contains your bot token)
     - Various cache and log files
   - Never commit your Discord bot token to GitHub!

## 🙋 FAQ

### Is the bot free to use?
Yes, the bot is completely free and open source.

### Can I customize the bot?
Absolutely! The code is open-source and can be modified to suit your needs.

### How many channels can the bot manage?
The bot is designed to handle servers with hundreds of channels efficiently.

### What can I do if the bot is offline?
If the bot appears offline, you can deploy your own instance using the setup instructions in this README. The bot is designed to run on any Node.js hosting platform including Replit, Railway, or your own server.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

<div align="center">
  <img src="https://raw.githubusercontent.com/KnarliX/My-pfp/refs/heads/main/pfp.png" alt="KnarliX" width="100" style="border-radius:50%">
  <h3>KnarliX</h3>
  <p>Lead Developer & Designer</p>
  <p>
    <a href="https://github.com/KnarliX" title="GitHub"><img src="https://img.shields.io/badge/GitHub-KnarliX-211F1F?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>
    <a href="https://discord.com/users/1212719184870383621" title="Discord"><img src="https://img.shields.io/badge/Discord-KnarliX-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://youtube.com/@KnarliX" title="YouTube"><img src="https://img.shields.io/badge/YouTube-KnarliX-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube"></a>
    <a href="https://instagram.com/KnarliX" title="Instagram"><img src="https://img.shields.io/badge/Instagram-KnarliX-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"></a>
  </p>
</div>

---

<p align="center">Made with ❤️ and TypeScript</p>