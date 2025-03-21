import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChannels } from "@/lib/discord";
import { Channel, ChannelType } from "@/types/discord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Hash, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";

interface ChannelSelectorProps {
  guildId: string;
  selectedChannels: Channel[];
  setSelectedChannels: (channels: Channel[]) => void;
  filterType?: ChannelType | ChannelType[];
  title?: string;
}

export default function ChannelSelector({ 
  guildId, 
  selectedChannels, 
  setSelectedChannels,
  filterType,
  title = "Select channels to keep"
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

  // Toggle channel selection - if it's already selected, keep it selected; if not, add it
  const toggleChannel = (channel: Channel) => {
    const isAlreadySelected = selectedChannels.some(c => c.id === channel.id);
    
    if (isAlreadySelected) {
      // Remove from selection
      const newSelectedChannels = selectedChannels.filter(c => c.id !== channel.id);
      setSelectedChannels(newSelectedChannels);
    } else {
      // Add to selection
      const newSelectedChannels = [...selectedChannels, channel];
      setSelectedChannels(newSelectedChannels);
    }
  };

  // Filter channels by search query and type
  const filteredChannels = channels
    ? channels.filter((channel) => {
        const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Apply type filter if specified
        if (filterType !== undefined) {
          if (Array.isArray(filterType)) {
            return matchesSearch && filterType.includes(channel.type as ChannelType);
          } else {
            return matchesSearch && channel.type === filterType;
          }
        }
        
        return matchesSearch;
      })
    : [];

  // Get filtered selected channels for counter display
  const filteredSelectedCount = filterType !== undefined 
    ? selectedChannels.filter(c => {
        if (Array.isArray(filterType)) {
          return filterType.includes(c.type as ChannelType);
        } else {
          return c.type === filterType;
        }
      }).length 
    : selectedChannels.length;

  // Get channel type icon
  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case ChannelType.GuildText:
      case ChannelType.GuildForum:
      case ChannelType.GuildAnnouncement:
        return <Hash className="h-4 w-4 text-discord-light" />;
      case ChannelType.GuildVoice:
        return <svg className="h-4 w-4 text-discord-light" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.5 12H22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1.5 12H4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4.5V1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 22.5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>;
      case ChannelType.GuildCategory:
        return <svg className="h-4 w-4 text-discord-light" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>;
      default:
        return <Hash className="h-4 w-4 text-discord-light" />;
    }
  };

  // Get channel type name
  const getChannelTypeName = (type: ChannelType) => {
    switch (type) {
      case ChannelType.GuildText:
        return "Text Channel";
      case ChannelType.GuildVoice:
        return "Voice Channel";  
      case ChannelType.GuildCategory:
        return "Category";
      case ChannelType.GuildAnnouncement:
        return "Announcement Channel";
      case ChannelType.GuildForum:
        return "Forum Channel";
      default:
        return "Channel";
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
          {filteredSelectedCount > 0
            ? `${filteredSelectedCount} channel${filteredSelectedCount > 1 ? "s" : ""} selected`
            : title}
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
                      className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-700' : ''}`}
                      onClick={() => toggleChannel(channel)}
                    >
                      <div className="flex items-center">
                        {getChannelIcon(channel.type as ChannelType)}
                        <span className="ml-2">{channel.name}</span>
                        <span className="ml-2 text-xs text-discord-light opacity-50">
                          {getChannelTypeName(channel.type as ChannelType)}
                        </span>
                      </div>
                      {isSelected ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4" /> // Empty placeholder for alignment
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
