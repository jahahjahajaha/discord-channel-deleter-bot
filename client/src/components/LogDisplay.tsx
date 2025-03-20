import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLogs, clearLogs } from "@/lib/discord";
import { LogEntry } from "@/types/discord";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface LogDisplayProps {
  guildId: string;
}

export default function LogDisplay({ guildId }: LogDisplayProps) {
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Query for logs
  const { 
    data: logs,
    isLoading, 
    refetch
  } = useQuery<LogEntry[]>({
    queryKey: [`/api/guilds/${guildId}/logs`],
    refetchInterval: 5000, // Refresh logs every 5 seconds
    enabled: !!guildId,
  });

  // Clear logs function
  const handleClearLogs = async () => {
    try {
      await clearLogs(guildId);
      refetch();
      toast({
        title: "Logs cleared",
        description: "Operation logs have been cleared successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear logs.",
        variant: "destructive",
      });
    }
  };

  // Auto-scroll to bottom of logs when new logs are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  // Get the appropriate color for each log type
  const getLogColor = (type: string) => {
    switch (type) {
      case "INFO":
        return "text-blue-400";
      case "WARNING":
        return "text-yellow-400";
      case "ERROR":
        return "text-red-400";
      case "SUCCESS":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="relative" ref={scrollAreaRef}>
      <ScrollArea className="bg-gray-800 rounded-md h-[200px] p-3 font-mono text-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-discord-light">Loading logs...</p>
          </div>
        ) : logs && logs.length > 0 ? (
          <div>
            {logs.map((log) => (
              <div key={log.id} className={`mb-1 ${getLogColor(log.type)}`}>
                [{formatTimestamp(log.timestamp)}] [{log.type}] {log.message}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-discord-light">No logs available</p>
          </div>
        )}
      </ScrollArea>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-discord-light hover:text-white"
        onClick={handleClearLogs}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
