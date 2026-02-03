import { memo } from 'react';
import { Conversation } from '@/types/conversation';
import { ChannelIcon } from './ChannelIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  UserPlus,
  CheckCircle2,
  VolumeX,
  Archive,
  Phone,
  Video,
  PanelRightOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatHeaderProps {
  conversation: Conversation;
  onMarkResolved: () => void;
  onMute: () => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

export const ChatHeader = memo(function ChatHeader({
  conversation,
  onMarkResolved,
  onMute,
  onTogglePanel,
  isPanelOpen,
}: ChatHeaderProps) {
  const { contact, channel, status } = conversation;

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusText = contact.isOnline
    ? 'Online'
    : contact.lastSeen
    ? `Last seen ${formatDistanceToNow(contact.lastSeen, { addSuffix: true })}`
    : 'Offline';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      {/* Left section - Contact info */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatar} alt={contact.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {contact.isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
            <ChannelIcon channel={channel} size={14} />
            {status === 'resolved' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-success/10 text-success rounded">
                Resolved
              </span>
            )}
            {status === 'muted' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">
                Muted
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${contact.isOnline ? 'bg-success' : 'bg-muted-foreground'}`}
            />
            {statusText}
          </p>
        </div>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
          <Video className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onTogglePanel}
          aria-label={isPanelOpen ? 'Close details panel' : 'Open details panel'}
        >
          <PanelRightOpen className={`h-4 w-4 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign to team
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkResolved}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as resolved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMute}>
              <VolumeX className="h-4 w-4 mr-2" />
              {status === 'muted' ? 'Unmute' : 'Mute'} conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
