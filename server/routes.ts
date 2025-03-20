import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertLogSchema, insertChannelSchema } from "@shared/schema";
import { startBot, getBotStatus, getGuilds, getChannels, deleteChannels } from "./discord/bot";

// Validate discord token
const discordTokenSchema = z.object({
  token: z.string().min(50).max(100),
});

// Validate delete channels request
const deleteChannelsSchema = z.object({
  guildId: z.string().min(1),
  keepChannelIds: z.array(z.string()).min(0),
});

// Validate guild ID parameter
const guildIdSchema = z.object({
  guildId: z.string().min(1),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize HTTP server
  const httpServer = createServer(app);

  // API routes
  // Bot status endpoint
  app.get("/api/bot/status", async (_req: Request, res: Response) => {
    try {
      const status = getBotStatus();
      res.json({ status });
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot status", error: (error as Error).message });
    }
  });

  // Initialize/start bot with token
  app.post("/api/bot/start", async (req: Request, res: Response) => {
    try {
      const { token } = discordTokenSchema.parse(req.body);
      
      const result = await startBot(token);
      
      if (result.success) {
        res.json({ message: "Bot started successfully", status: result.status });
      } else {
        res.status(400).json({ message: "Failed to start bot", error: result.error });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid token format", error: error.errors });
      } else {
        res.status(500).json({ message: "Failed to start bot", error: (error as Error).message });
      }
    }
  });

  // Get all available guilds (servers)
  app.get("/api/guilds", async (_req: Request, res: Response) => {
    try {
      const guilds = await getGuilds();
      res.json(guilds);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch guilds", error: (error as Error).message });
    }
  });

  // Get channels for a specific guild
  app.get("/api/guilds/:guildId/channels", async (req: Request, res: Response) => {
    try {
      const { guildId } = guildIdSchema.parse(req.params);
      const channels = await getChannels(guildId);
      res.json(channels);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid guild ID", error: error.errors });
      } else {
        res.status(500).json({ message: "Failed to fetch channels", error: (error as Error).message });
      }
    }
  });

  // Get logs for a specific guild
  app.get("/api/guilds/:guildId/logs", async (req: Request, res: Response) => {
    try {
      const { guildId } = guildIdSchema.parse(req.params);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const logs = await storage.getLogsByGuildId(guildId, limit);
      res.json(logs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid guild ID", error: error.errors });
      } else {
        res.status(500).json({ message: "Failed to fetch logs", error: (error as Error).message });
      }
    }
  });

  // Clear logs for a specific guild
  app.delete("/api/guilds/:guildId/logs", async (req: Request, res: Response) => {
    try {
      const { guildId } = guildIdSchema.parse(req.params);
      const success = await storage.clearLogsByGuildId(guildId);
      
      if (success) {
        res.json({ message: "Logs cleared successfully" });
      } else {
        res.status(500).json({ message: "Failed to clear logs" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid guild ID", error: error.errors });
      } else {
        res.status(500).json({ message: "Failed to clear logs", error: (error as Error).message });
      }
    }
  });

  // Delete channels except for the ones to keep
  app.post("/api/guilds/:guildId/delete-channels", async (req: Request, res: Response) => {
    try {
      const { guildId } = guildIdSchema.parse(req.params);
      const { keepChannelIds } = deleteChannelsSchema.parse({ 
        guildId,
        keepChannelIds: req.body.keepChannelIds 
      });
      
      const result = await deleteChannels(guildId, keepChannelIds);
      
      if (result.success) {
        res.json({ 
          message: "Channels deleted successfully", 
          deletedCount: result.deletedCount,
          failedCount: result.failedCount 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to delete channels", 
          error: result.error,
          deletedCount: result.deletedCount,
          failedCount: result.failedCount
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", error: error.errors });
      } else {
        res.status(500).json({ message: "Failed to delete channels", error: (error as Error).message });
      }
    }
  });

  return httpServer;
}
