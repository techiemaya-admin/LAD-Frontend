import { memo } from 'react';
import { Conversation, ContactTag } from '@/types/conversation';
import { ChannelIcon } from './ChannelIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const tagConfig: Record<ContactTag, { label: string; className: string }> = {
  hot: { 
    label: 'Hot', 
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20' 
  },
  warm: { 
    label: 'Warm', 
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' 
  },
  cold: { 
    label: 'Cold', 
    className: 'bg-info/10 text-info border-info/20 hover:bg-info/20' 
  },
};

export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
}: ConversationListItemProps) {
  const { contact, lastMessage, unreadCount, channel, updatedAt } = conversation;
  const hasUnread = unreadCount > 0;

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = formatDistanceToNow(updatedAt, { addSuffix: false });

  // Get the primary tag (first one)
  const primaryTag = contact.tags[0];

  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'conversation-item flex items-start gap-3 p-3 border-b border-border/50',
        isSelected && 'conversation-item-active bg-primary/5',
        hasUnread && 'conversation-item-unread'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conversation.id)}
    >
      {/* Avatar with channel icon overlay */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={contact.avatar} alt={contact.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Channel icon at bottom-right of avatar */}
        <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card border-2 border-card flex items-center justify-center">
          <ChannelIcon channel={channel} size={12} />
        </span>
        {/* Online indicator - moved to top-right */}
        {contact.isOnline && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
              {contact.name}
            </span>
            {/* Tag badge next to name */}
            {primaryTag && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-[10px] px-1.5 py-0 h-4 font-medium border',
                  tagConfig[primaryTag].className
                )}
              >
                {tagConfig[primaryTag].label}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
        </div>

        {contact.company && (
          <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
        )}

        <div className="flex items-center justify-between mt-1">
          <p
            className={cn(
              'text-sm truncate max-w-[180px]',
              hasUnread ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {lastMessage?.isOutgoing && <span className="text-muted-foreground">You: </span>}
            {lastMessage?.content || 'No messages yet'}
          </p>

          {hasUnread && (
            <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
