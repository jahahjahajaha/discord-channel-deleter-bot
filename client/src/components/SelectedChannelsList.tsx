import { Channel, ChannelType } from "@/types/discord";
import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SelectedChannelsListProps {
  selectedChannels: Channel[];
  setSelectedChannels: (channels: Channel[]) => void;
}

export default function SelectedChannelsList({
  selectedChannels,
  setSelectedChannels,
}: SelectedChannelsListProps) {
  // Removed the channel removal functionality as per requirements

  // Get channel type icon
  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case ChannelType.GuildText:
      case ChannelType.GuildForum:
      case ChannelType.GuildAnnouncement:
        return <Hash className="h-3 w-3 text-discord-light" />;
      case ChannelType.GuildVoice:
        return <svg className="h-3 w-3 text-discord-light" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 16.5C14.4853 16.5 16.5 14.4853 16.5 12C16.5 9.51472 14.4853 7.5 12 7.5C9.51472 7.5 7.5 9.51472 7.5 12C7.5 14.4853 9.51472 16.5 12 16.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.5 12H22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1.5 12H4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4.5V1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 22.5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>;
      case ChannelType.GuildCategory:
        return <svg className="h-3 w-3 text-discord-light" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>;
      default:
        return <Hash className="h-3 w-3 text-discord-light" />;
    }
  };

  return (
    <div>
      <h3 className="text-sm uppercase font-semibold text-discord-light mb-2">
        Selected Channels to Keep
      </h3>
      <div className="bg-gray-800 rounded-md p-3 min-h-[64px]">
        {selectedChannels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedChannels.map((channel) => (
              <Badge 
                key={channel.id} 
                variant="outline" 
                className="bg-gray-700 border-0 text-white py-1 pl-1.5 pr-2 flex items-center gap-1.5"
              >
                {getChannelIcon(channel.type as ChannelType)}
                {channel.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-discord-light text-sm">
            No channels selected. All channels will be deleted.
          </p>
        )}
      </div>
    </div>
  );
}
