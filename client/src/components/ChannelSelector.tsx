import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChannels } from "@/lib/discord";
import { Channel, ChannelType } from "@/types/discord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Hash } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";

interface ChannelSelectorProps {
  guildId: string;
  selectedChannels: Channel[];
  setSelectedChannels: (channels: Channel[]) => void;
}

export default function ChannelSelector({ 
  guildId, 
  selectedChannels, 
  setSelectedChannels 
}: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch channels
  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: [`/api/guilds/${guildId}/channels`],
    enabled: !!guildId,
  });

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("channel-selector");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle channel selection
  const toggleChannel = (channel: Channel) => {
    const isSelected = selectedChannels.some((c) => c.id === channel.id);
    
    if (isSelected) {
      setSelectedChannels(selectedChannels.filter((c) => c.id !== channel.id));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  // Filter channels by search query
  const filteredChannels = channels
    ? channels.filter((channel) => 
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        // Only include text, announcement, and forum channels
        [
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum
        ].includes(channel.type as ChannelType)
      )
    : [];

  // Get channel type icon
  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case ChannelType.GuildText:
      case ChannelType.GuildForum:
      case ChannelType.GuildAnnouncement:
        return <Hash className="h-4 w-4 text-discord-light" />;
      default:
        return <Hash className="h-4 w-4 text-discord-light" />;
    }
  };

  return (
    <div className="mb-5 relative" id="channel-selector">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full bg-gray-800 border-0 flex justify-between"
        onClick={toggleDropdown}
      >
        <span className="text-white">
          {selectedChannels.length > 0
            ? `${selectedChannels.length} channel${selectedChannels.length > 1 ? "s" : ""} selected`
            : "Select channels to keep"}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {isOpen && (
        <div className="absolute mt-2 w-full z-10 rounded-md border bg-gray-800 text-white shadow-md animate-in fade-in-80">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search channels..."
                className="w-full bg-gray-700 text-white border-0 pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="max-h-[300px]">
            {isLoading ? (
              <div className="py-6 text-center">
                <div className="text-sm text-discord-light">Loading channels...</div>
              </div>
            ) : filteredChannels.length > 0 ? (
              <div className="py-1">
                {filteredChannels.map((channel) => {
                  const isSelected = selectedChannels.some((c) => c.id === channel.id);
                  
                  return (
                    <div
                      key={channel.id}
                      className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleChannel(channel)}
                    >
                      <div className="flex items-center">
                        {getChannelIcon(channel.type as ChannelType)}
                        <span className="ml-2">{channel.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="text-sm text-discord-light">No channels found</div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
