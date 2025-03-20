import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getBotStatus, startBot, getGuilds, deleteChannels } from "@/lib/discord";
import { BotStatus, Guild, Channel } from "@/types/discord";
import Sidebar from "@/components/Sidebar";
import ChannelSelector from "@/components/ChannelSelector";
import SelectedChannelsList from "@/components/SelectedChannelsList";
import ConfirmationModal from "@/components/ConfirmationModal";
import LogDisplay from "@/components/LogDisplay";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, RefreshCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define the token form schema
const tokenFormSchema = z.object({
  token: z.string().min(50, "Token must be at least 50 characters long"),
});

type TokenFormValues = z.infer<typeof tokenFormSchema>;

export default function Home() {
  const { toast } = useToast();
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Initialize token form
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      token: "",
    },
  });

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

  // Mutation for starting the bot
  const startBotMutation = useMutation({
    mutationFn: (token: string) => startBot(token),
    onSuccess: (data) => {
      if (data.status === "online") {
        toast({
          title: "Bot Started",
          description: "The bot has been successfully started.",
        });
        refetchStatus();
        refetchGuilds();
        setShowTokenForm(false);
      } else {
        toast({
          title: "Bot Error",
          description: data.error || "There was an error starting the bot.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Bot Error",
        description: (error as Error).message || "There was an error starting the bot.",
        variant: "destructive",
      });
    },
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

  // Handle token form submission
  const onTokenSubmit = (values: TokenFormValues) => {
    startBotMutation.mutate(values.token);
  };

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

  // Reset channel selection
  const handleResetSelection = () => {
    setSelectedChannels([]);
  };

  // Check if bot is offline
  const isBotOffline = !isLoadingStatus && (!botStatus || botStatus.status === "offline");

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
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowTokenForm(!showTokenForm)}
              >
                <AlertCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {isBotOffline || showTokenForm ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Discord Bot Setup</CardTitle>
                <CardDescription>
                  Enter your Discord bot token to start the bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onTokenSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discord Bot Token</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your Discord bot token" 
                              type="password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={startBotMutation.isPending}
                      className="bg-discord-blurple hover:bg-opacity-80"
                    >
                      {startBotMutation.isPending ? "Starting..." : "Start Bot"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : null}

          {/* Bot Description Card */}
          <Card className="mb-6 bg-discord-dark border-0">
            <CardHeader>
              <CardTitle>Discord Channel Manager Bot</CardTitle>
              <CardDescription className="text-discord-light">
                This bot helps you manage your Discord server channels efficiently by allowing you to select which channels to keep and delete the rest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-800 p-3 rounded-md mb-4">
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <code className="mr-2">{'</>'}</code>
                  <span>Command Usage</span>
                </div>
                <code className="text-sm font-mono block text-white bg-gray-900 p-3 rounded overflow-x-auto">
                  /delete-channels [keep: list of channels to keep]
                </code>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-3 rounded-md flex items-start">
                  <div className="mt-1 mr-3 text-discord-blurple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 11L11 15L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Select Channels</h3>
                    <p className="text-discord-light text-sm">Choose which channels to keep</p>
                  </div>
                </div>
                <div className="bg-gray-800 p-3 rounded-md flex items-start">
                  <div className="mt-1 mr-3 text-discord-red">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Delete Bulk</h3>
                    <p className="text-discord-light text-sm">Remove multiple channels at once</p>
                  </div>
                </div>
                <div className="bg-gray-800 p-3 rounded-md flex items-start">
                  <div className="mt-1 mr-3 text-discord-green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 12.5L10 15.5L17 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Authorization</h3>
                    <p className="text-discord-light text-sm">Only admins can use this command</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <ChannelSelector 
                    guildId={selectedGuildId}
                    selectedChannels={selectedChannels}
                    setSelectedChannels={setSelectedChannels}
                  />
                  
                  <div className="mb-6">
                    <SelectedChannelsList 
                      selectedChannels={selectedChannels}
                      setSelectedChannels={setSelectedChannels}
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
