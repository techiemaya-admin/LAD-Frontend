import { memo, useState, useCallback } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  UserPlus,
  CheckCircle2,
  VolumeX,
  PanelRightOpen,
  Pin,
  Lock,
  Download,
  ShieldBan,
  Trash2,
  Star,
  MailCheck,
  Search,
  ChevronLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSettings } from './MessageSettings';

interface ChatHeaderProps {
  conversation: Conversation;
  onMarkResolved: () => void;
  onMute: () => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  onPin?: () => void;
  onLock?: () => void;
  onFavorite?: () => void;
  onExport?: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export const ChatHeader = memo(function ChatHeader({
  conversation,
  onMarkResolved,
  onMute,
  onTogglePanel,
  isPanelOpen,
  onPin,
  onLock,
  onFavorite,
  onExport,
  onBlock,
  onDelete,
  onBack,
}: ChatHeaderProps) {
  const { contact, channel, status } = conversation;
  const [confirmAction, setConfirmAction] = useState<'block' | 'delete' | null>(null);

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

  const handleConfirmedAction = useCallback(() => {
    if (confirmAction === 'block') onBlock?.();
    if (confirmAction === 'delete') onDelete?.();
    setConfirmAction(null);
  }, [confirmAction, onBlock, onDelete]);

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b border-border bg-card">
        {/* Left section - Contact info */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 lg:hidden shrink-0" 
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 md:h-10 md:w-10">
              <AvatarImage src={contact.avatar} alt={contact.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {contact.isOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2">
              <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
              <ChannelIcon channel={channel} size={14} />
              {status === 'resolved' && (
                <span className="hidden xs:inline-block px-1.5 py-0.5 text-[10px] font-medium bg-success/10 text-success rounded">
                  Resolved
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${contact.isOnline ? 'bg-success' : 'bg-muted-foreground'}`}
              />
              <span className="truncate">{statusText}</span>
            </p>
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="h-4 w-4" />
          </Button>

          <MessageSettings />

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
            <DropdownMenuContent align="end" className="w-56 py-2">
              <DropdownMenuItem onClick={onFavorite} className="py-2.5 px-4 text-sm">
                <Star className={`h-4 w-4 mr-3 ${conversation.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {conversation.is_favorite ? 'Remove from favorites' : 'Starred messages'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPin} className="py-2.5 px-4 text-sm">
                <Pin className="h-4 w-4 mr-3" />
                {conversation.is_pinned ? 'Unpin conversation' : 'Pin conversation'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMarkResolved} className="py-2.5 px-4 text-sm">
                <CheckCircle2 className="h-4 w-4 mr-3" />
                Mark as resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMute} className="py-2.5 px-4 text-sm">
                <VolumeX className="h-4 w-4 mr-3" />
                {status === 'muted' ? 'Unmute conversation' : 'Mute conversation'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLock} className="py-2.5 px-4 text-sm">
                <Lock className="h-4 w-4 mr-3" />
                {conversation.is_locked ? 'Unlock conversation' : 'Lock conversation'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport} className="py-2.5 px-4 text-sm">
                <Download className="h-4 w-4 mr-3" />
                Export chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive py-2.5 px-4 text-sm" onClick={() => setConfirmAction('block')}>
                <ShieldBan className="h-4 w-4 mr-3" />
                Block contact
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive py-2.5 px-4 text-sm" onClick={() => setConfirmAction('delete')}>
                <Trash2 className="h-4 w-4 mr-3" />
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'block' ? 'Block Contact' : 'Delete Conversation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'block'
                ? `Are you sure you want to block ${contact.name}? They will not be able to send you messages.`
                : 'Are you sure you want to delete this conversation? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmAction === 'block' ? 'Block' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
