import { Channel, ChannelType } from "@/types/discord";
import { X, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SelectedChannelsListProps {
  selectedChannels: Channel[];
  setSelectedChannels: (channels: Channel[]) => void;
}

export default function SelectedChannelsList({
  selectedChannels,
  setSelectedChannels,
}: SelectedChannelsListProps) {
  const removeChannel = (channelId: string) => {
    setSelectedChannels(selectedChannels.filter((channel) => channel.id !== channelId));
  };

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
        रखने के लिए चुने गए चैनल
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
                <button
                  type="button"
                  onClick={() => removeChannel(channel.id)}
                  className="text-discord-light hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-discord-blurple"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-discord-light text-sm">
            कोई चैनल नहीं चुना गया। सभी चैनल हटा दिए जाएंगे।
          </p>
        )}
      </div>
    </div>
  );
}
