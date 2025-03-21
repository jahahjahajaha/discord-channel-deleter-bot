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
