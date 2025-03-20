import { users, type User, type InsertUser, guilds, type Guild, type InsertGuild, channels, type Channel, type InsertChannel, logs, type Log, type InsertLog } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Guild operations
  getGuild(id: string): Promise<Guild | undefined>;
  getAllGuilds(): Promise<Guild[]>;
  createGuild(guild: InsertGuild): Promise<Guild>;
  updateGuild(id: string, guild: Partial<Guild>): Promise<Guild | undefined>;
  deleteGuild(id: string): Promise<boolean>;
  
  // Channel operations
  getChannel(id: string): Promise<Channel | undefined>;
  getChannelsByGuildId(guildId: string): Promise<Channel[]>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: string, channel: Partial<Channel>): Promise<Channel | undefined>;
  deleteChannel(id: string): Promise<boolean>;
  
  // Log operations
  createLog(log: InsertLog): Promise<Log>;
  getLogsByGuildId(guildId: string, limit?: number): Promise<Log[]>;
  clearLogsByGuildId(guildId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private guilds: Map<string, Guild>;
  private channels: Map<string, Channel>;
  private logs: Map<number, Log>;
  
  private userCurrentId: number;
  private logCurrentId: number;

  constructor() {
    this.users = new Map();
    this.guilds = new Map();
    this.channels = new Map();
    this.logs = new Map();
    
    this.userCurrentId = 1;
    this.logCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Guild operations
  async getGuild(id: string): Promise<Guild | undefined> {
    return this.guilds.get(id);
  }
  
  async getAllGuilds(): Promise<Guild[]> {
    return Array.from(this.guilds.values());
  }
  
  async createGuild(guild: InsertGuild): Promise<Guild> {
    const newGuild: Guild = { ...guild };
    this.guilds.set(guild.id, newGuild);
    return newGuild;
  }
  
  async updateGuild(id: string, guild: Partial<Guild>): Promise<Guild | undefined> {
    const existingGuild = await this.getGuild(id);
    if (!existingGuild) return undefined;
    
    const updatedGuild = { ...existingGuild, ...guild };
    this.guilds.set(id, updatedGuild);
    return updatedGuild;
  }
  
  async deleteGuild(id: string): Promise<boolean> {
    return this.guilds.delete(id);
  }
  
  // Channel operations
  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }
  
  async getChannelsByGuildId(guildId: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      (channel) => channel.guildId === guildId
    );
  }
  
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const newChannel: Channel = { ...channel };
    this.channels.set(channel.id, newChannel);
    return newChannel;
  }
  
  async updateChannel(id: string, channel: Partial<Channel>): Promise<Channel | undefined> {
    const existingChannel = await this.getChannel(id);
    if (!existingChannel) return undefined;
    
    const updatedChannel = { ...existingChannel, ...channel };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }
  
  async deleteChannel(id: string): Promise<boolean> {
    return this.channels.delete(id);
  }
  
  // Log operations
  async createLog(log: InsertLog): Promise<Log> {
    const id = this.logCurrentId++;
    const timestamp = new Date();
    const newLog: Log = { ...log, id, timestamp };
    this.logs.set(id, newLog);
    return newLog;
  }
  
  async getLogsByGuildId(guildId: string, limit?: number): Promise<Log[]> {
    const logs = Array.from(this.logs.values())
      .filter((log) => log.guildId === guildId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? logs.slice(0, limit) : logs;
  }
  
  async clearLogsByGuildId(guildId: string): Promise<boolean> {
    let success = true;
    
    for (const [id, log] of this.logs.entries()) {
      if (log.guildId === guildId) {
        if (!this.logs.delete(id)) {
          success = false;
        }
      }
    }
    
    return success;
  }
}

export const storage = new MemStorage();
