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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-discord-dark border-0 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl">
            Confirm Channel Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className="text-discord-light">
            Are you sure you want to delete all channels except the selected ones? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-red-900 bg-opacity-20 border border-discord-red rounded-md p-3 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="text-discord-red mr-3 mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-discord-red">Warning: Destructive Action</h4>
              <p className="text-sm text-discord-light">
                This will permanently delete all channels from your server except for the selected ones.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-md mb-5">
          <h4 className="text-sm uppercase font-semibold text-discord-light mb-2">
            Channels to keep:
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
                No channels selected. ALL channels will be deleted!
              </p>
            )}
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-gray-700 text-white border-0 hover:bg-gray-600"
            disabled={isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            className="bg-discord-red text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Confirm Deletion"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
