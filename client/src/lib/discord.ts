import { apiRequest } from './queryClient';
import { BotStatus, Guild, Channel, LogEntry, DeleteChannelsResult } from '@/types/discord';

// Get bot status
export async function getBotStatus(): Promise<BotStatus> {
  const res = await apiRequest('GET', '/api/bot/status');
  return await res.json();
}

// Start the bot with a token
export async function startBot(token: string): Promise<BotStatus> {
  const res = await apiRequest('POST', '/api/bot/start', { token });
  return await res.json();
}

// Get all guilds (servers) the bot is a member of
export async function getGuilds(): Promise<Guild[]> {
  const res = await apiRequest('GET', '/api/guilds');
  return await res.json();
}

// Get all channels in a guild
export async function getChannels(guildId: string): Promise<Channel[]> {
  const res = await apiRequest('GET', `/api/guilds/${guildId}/channels`);
  return await res.json();
}

// Get logs for a guild
export async function getLogs(guildId: string, limit?: number): Promise<LogEntry[]> {
  const url = limit 
    ? `/api/guilds/${guildId}/logs?limit=${limit}`
    : `/api/guilds/${guildId}/logs`;
  
  const res = await apiRequest('GET', url);
  return await res.json();
}

// Clear logs for a guild
export async function clearLogs(guildId: string): Promise<{ message: string }> {
  const res = await apiRequest('DELETE', `/api/guilds/${guildId}/logs`);
  return await res.json();
}

// Delete channels except for the ones to keep
export async function deleteChannels(
  guildId: string, 
  keepChannelIds: string[]
): Promise<DeleteChannelsResult> {
  const res = await apiRequest(
    'POST', 
    `/api/guilds/${guildId}/delete-channels`, 
    { keepChannelIds }
  );
  return await res.json();
}
