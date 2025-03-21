import { Channel, ChannelType } from "@/types/discord";
import { AlertTriangle, Hash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedChannels: Channel[];
  isPending: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedChannels,
  isPending,
}: ConfirmationModalProps) {
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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-discord-dark border-0 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl">
            चैनल हटाने की पुष्टि करें
          </AlertDialogTitle>
          <AlertDialogDescription className="text-discord-light">
            क्या आप सुनिश्चित हैं कि आप चुने गए चैनलों को छोड़कर सभी चैनलों को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-red-900 bg-opacity-20 border border-discord-red rounded-md p-3 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="text-discord-red mr-3 mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-discord-red">चेतावनी: विनाशकारी क्रिया</h4>
              <p className="text-sm text-discord-light">
                यह चुने गए चैनलों को छोड़कर आपके सर्वर से सभी चैनलों को स्थायी रूप से हटा देगा।
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-md mb-5">
          <h4 className="text-sm uppercase font-semibold text-discord-light mb-2">
            रखने के लिए चैनल:
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedChannels.length > 0 ? (
              selectedChannels.map((channel) => (
                <Badge 
                  key={channel.id} 
                  variant="outline"
                  className="bg-gray-700 border-0 text-white py-1 pl-1.5 pr-2 flex items-center gap-1.5"
                >
                  {getChannelIcon(channel.type as ChannelType)}
                  {channel.name}
                </Badge>
              ))
            ) : (
              <p className="text-discord-light text-sm">
                कोई चैनल नहीं चुना गया। सभी चैनल हटा दिए जाएंगे!
              </p>
            )}
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-gray-700 text-white border-0 hover:bg-gray-600"
            disabled={isPending}
          >
            रद्द करें
          </AlertDialogCancel>
          <AlertDialogAction 
            className="bg-discord-red text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "हटाया जा रहा है..." : "हटाने की पुष्टि करें"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
