import { useState } from "react";
import { Guild } from "@/types/discord";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Settings, HelpCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  selectedGuildId: string | null;
  setSelectedGuildId: (id: string) => void;
  guilds: Guild[];
  isLoading: boolean;
  botStatus: string;
}

export default function Sidebar({ 
  selectedGuildId, 
  setSelectedGuildId, 
  guilds, 
  isLoading,
  botStatus
}: SidebarProps) {
  const [activeSection, setActiveSection] = useState("cleanup");

  return (
    <div className="w-full lg:w-64 bg-discord-darker border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold">Channel Manager</h1>
        </div>
        <p className="text-discord-light text-sm mt-2">Manage your Discord server channels efficiently</p>
      </div>

      <nav className="p-4">
        <h2 className="text-discord-light uppercase text-xs font-bold tracking-wider mb-3">Navigation</h2>
        <ul>
          <li className="mb-1">
            <Button
              variant={activeSection === "cleanup" ? "default" : "ghost"}
              className={activeSection === "cleanup" 
                ? "w-full justify-start bg-discord-blurple hover:bg-opacity-80" 
                : "w-full justify-start text-discord-light"}
              onClick={() => setActiveSection("cleanup")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Channel Management
            </Button>
          </li>
          <li className="mb-1">
            <Button
              variant={activeSection === "settings" ? "default" : "ghost"}
              className={activeSection === "settings" 
                ? "w-full justify-start bg-discord-blurple hover:bg-opacity-80" 
                : "w-full justify-start text-discord-light"}
              onClick={() => setActiveSection("settings")}
              disabled={true}
            >
              <Settings className="mr-2 h-4 w-4" />
              Bot Settings
            </Button>
          </li>
          <li className="mb-1">
            <Button
              variant={activeSection === "help" ? "default" : "ghost"}
              className={activeSection === "help" 
                ? "w-full justify-start bg-discord-blurple hover:bg-opacity-80" 
                : "w-full justify-start text-discord-light"}
              onClick={() => setActiveSection("help")}
              disabled={true}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </Button>
          </li>
        </ul>

        {botStatus === "online" && (
          <>
            <h2 className="text-discord-light uppercase text-xs font-bold tracking-wider mt-6 mb-3">
              Servers
            </h2>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full bg-gray-700" />
                <Skeleton className="h-9 w-full bg-gray-700" />
                <Skeleton className="h-9 w-full bg-gray-700" />
              </div>
            ) : guilds && guilds.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="pr-3">
                  {guilds.map((guild) => (
                    <div
                      key={guild.id}
                      className={`mb-1 px-3 py-2.5 rounded cursor-pointer flex items-center ${
                        selectedGuildId === guild.id
                          ? "bg-gray-700 text-white"
                          : "text-discord-light hover:bg-gray-700 hover:text-white"
                      }`}
                      onClick={() => setSelectedGuildId(guild.id)}
                    >
                      {guild.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                          alt={guild.name}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-discord-blurple mr-2 flex items-center justify-center text-xs">
                          {guild.name.charAt(0)}
                        </div>
                      )}
                      <span className="truncate">{guild.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-discord-light text-sm text-center py-2">
                No servers available
              </div>
            )}
          </>
        )}

        <h2 className="text-discord-light uppercase text-xs font-bold tracking-wider mt-6 mb-3">
          Quick Actions
        </h2>
        <ul>
          <li className="mb-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-discord-light"
              disabled={botStatus !== "online"}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Channels
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
