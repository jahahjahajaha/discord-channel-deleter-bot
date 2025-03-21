import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getBotStatus, getGuilds, deleteChannels } from "@/lib/discord";
import { BotStatus, Guild, Channel, ChannelType } from "@/types/discord";
import Sidebar from "@/components/Sidebar";
import ChannelSelector from "@/components/ChannelSelector";
import SelectedChannelsList from "@/components/SelectedChannelsList";
import ConfirmationModal from "@/components/ConfirmationModal";
import LogDisplay from "@/components/LogDisplay";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  const { toast } = useToast();
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Store selected channels by guild ID
  const [guildSelections, setGuildSelections] = useState<Record<string, Channel[]>>({});
  
  // The current selected channels based on the selected guild
  const selectedChannels = selectedGuildId && guildSelections[selectedGuildId] 
    ? guildSelections[selectedGuildId] 
    : [];

  // Function to update selected channels for the current guild
  const updateSelectedChannels = (channels: Channel[]) => {
    if (selectedGuildId) {
      setGuildSelections(prev => ({
        ...prev,
        [selectedGuildId]: channels
      }));
    }
  };

  // Query for bot status
  const { 
    data: botStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for guilds (only when bot is online)
  const {
    data: guilds,
    isLoading: isLoadingGuilds,
    refetch: refetchGuilds
  } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
    enabled: botStatus?.status === "online",
  });

  // Mutation for deleting channels
  const deleteChannelsMutation = useMutation({
    mutationFn: ({ guildId, keepChannelIds }: { guildId: string; keepChannelIds: string[] }) => 
      deleteChannels(guildId, keepChannelIds),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Channels Deleted",
          description: `Successfully deleted ${data.deletedCount} channels. Failed to delete ${data.failedCount} channels.`,
        });
      } else {
        toast({
          title: "Deletion Error",
          description: data.error || "There was an error deleting the channels.",
          variant: "destructive",
        });
      }
      refetchGuilds();
    },
    onError: (error) => {
      toast({
        title: "Deletion Error",
        description: (error as Error).message || "There was an error deleting the channels.",
        variant: "destructive",
      });
    },
  });

  // Handle delete channels
  const handleDeleteChannels = () => {
    if (!selectedGuildId) {
      toast({
        title: "Error",
        description: "Please select a server first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedChannels.length === 0) {
      toast({
        title: "Warning",
        description: "You haven't selected any channels to keep. This will delete ALL channels in the server.",
        variant: "destructive",
      });
    }

    // Show confirmation modal
    setIsConfirmModalOpen(true);
  };

  // Handle confirmation modal confirm
  const handleConfirmDelete = () => {
    if (!selectedGuildId) return;
    
    const channelIds = selectedChannels.map((channel) => channel.id);
    deleteChannelsMutation.mutate({
      guildId: selectedGuildId,
      keepChannelIds: channelIds,
    });
    
    setIsConfirmModalOpen(false);
  };

  // Reset channel selection for current guild
  const handleResetSelection = () => {
    if (selectedGuildId) {
      setGuildSelections(prev => ({
        ...prev,
        [selectedGuildId]: []
      }));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-discord-darker text-white">
      <Sidebar 
        selectedGuildId={selectedGuildId} 
        setSelectedGuildId={setSelectedGuildId}
        guilds={guilds || []}
        isLoading={isLoadingGuilds}
        botStatus={botStatus?.status || "offline"}
      />
      
      <div className="flex-1 overflow-auto">
        <header className="bg-discord-dark p-4 border-b border-gray-700 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Channel Management</h1>
            <div className="flex items-center space-x-2">
              {botStatus?.status === "online" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                  Bot Online
                </span>
              ) : botStatus?.status === "error" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
                  Bot Error
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <span className="h-2 w-2 rounded-full bg-gray-500 mr-1.5"></span>
                  Bot Offline
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Channel Management Card */}
          <Card className="mb-6 bg-discord-dark border-0">
            <CardHeader>
              <CardTitle>Channel Selection</CardTitle>
              <CardDescription className="text-discord-light">
                Select channels you want to keep. All other channels will be deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedGuildId ? (
                <>
                  <div className="mb-4 grid grid-cols-1 gap-2">
                    <h4 className="text-sm font-semibold text-white">Category Channels</h4>
                    <ChannelSelector 
                      guildId={selectedGuildId}
                      selectedChannels={selectedChannels.filter(c => c.type === ChannelType.GuildCategory)}
                      setSelectedChannels={(channels) => {
                        const otherChannels = selectedChannels.filter(c => c.type !== ChannelType.GuildCategory);
                        updateSelectedChannels([...otherChannels, ...channels]);
                      }}
                    />
                    
                    <h4 className="text-sm font-semibold text-white mt-4">Text Channels</h4>
                    <ChannelSelector 
                      guildId={selectedGuildId}
                      selectedChannels={selectedChannels.filter(c => 
                        c.type === ChannelType.GuildText || 
                        c.type === ChannelType.GuildAnnouncement || 
                        c.type === ChannelType.GuildForum
                      )}
                      setSelectedChannels={(channels) => {
                        const otherChannels = selectedChannels.filter(c => 
                          c.type !== ChannelType.GuildText && 
                          c.type !== ChannelType.GuildAnnouncement && 
                          c.type !== ChannelType.GuildForum
                        );
                        updateSelectedChannels([...otherChannels, ...channels]);
                      }}
                    />
                    
                    <h4 className="text-sm font-semibold text-white mt-4">Voice Channels</h4>
                    <ChannelSelector 
                      guildId={selectedGuildId}
                      selectedChannels={selectedChannels.filter(c => c.type === ChannelType.GuildVoice)}
                      setSelectedChannels={(channels) => {
                        const otherChannels = selectedChannels.filter(c => c.type !== ChannelType.GuildVoice);
                        updateSelectedChannels([...otherChannels, ...channels]);
                      }}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <SelectedChannelsList 
                      selectedChannels={selectedChannels}
                      setSelectedChannels={updateSelectedChannels}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleResetSelection}
                      className="bg-gray-700 border-0 text-white hover:bg-gray-600"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Reset Selection
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteChannels}
                      disabled={deleteChannelsMutation.isPending}
                      className="bg-discord-red hover:bg-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleteChannelsMutation.isPending 
                        ? "Deleting..." 
                        : "Delete Other Channels"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center p-6 text-center">
                  <div>
                    <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Server Selected</h3>
                    <p className="text-discord-light mb-4">
                      Please select a server from the sidebar to manage its channels.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Card */}
          <Card className="bg-discord-dark border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Operation Log</CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-discord-light hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {selectedGuildId ? (
                <LogDisplay guildId={selectedGuildId} />
              ) : (
                <div className="bg-gray-800 rounded-md p-3 h-40 flex items-center justify-center font-mono text-sm">
                  <p className="text-discord-light">Select a server to view logs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        selectedChannels={selectedChannels}
        isPending={deleteChannelsMutation.isPending}
      />
    </div>
  );
}
