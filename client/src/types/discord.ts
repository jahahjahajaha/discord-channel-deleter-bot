// Discord channel types
export enum ChannelType {
  GuildText = 0,
  GuildVoice = 2,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  GuildForum = 15
}

// Channel interface for display in UI
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  position: number;
  parentId: string | null;
  selected?: boolean;
}

// Guild (server) interface
export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
}

// Log entry interface
export interface LogEntry {
  id: number;
  guildId: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp: string;
}

// Bot status interface
export interface BotStatus {
  status: 'offline' | 'online' | 'error';
  error?: string;
}

// Delete channels result
export interface DeleteChannelsResult {
  success: boolean;
  message: string;
  deletedCount: number;
  failedCount: number;
  error?: string;
}
