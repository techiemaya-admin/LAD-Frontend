import { memo, useRef, useEffect } from 'react';
import { Conversation, ContactTag } from '@/types/conversation';
import { ChannelIcon } from './ChannelIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Pin, Star, Lock, CheckSquare, Square } from 'lucide-react';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isSelectMode?: boolean;
  isChecked?: boolean;
  onContextStatusClick?: (status: string) => void;
  onDoubleClick?: () => void;
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

/** Distinct colors for each context status */
const CONTEXT_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  onboarding_greeting:          { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  onboarding_profile:           { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  onboarding_complete:          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  icp_discovery:                { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
  match_suggested:              { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  coordination_a_availability:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  coordination_b_availability:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  coordination_overlap_proposed:{ bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  post_meeting_followup:        { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200' },
  kpi_query:                    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  idle:                         { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200' },
  general_qa:                   { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
};

const DEFAULT_STATUS_COLOR = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

function getStatusColor(status: string) {
  return CONTEXT_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
}

export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
  isSelectMode = false,
  isChecked = false,
  onContextStatusClick,
  onDoubleClick,
}: ConversationListItemProps) {
  const { contact, lastMessage, unreadCount, channel, updatedAt } = conversation;
  const hasUnread = unreadCount > 0;
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleItemClick = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        // Single click - just select
        onSelect(conversation.id);
        clickCountRef.current = 0;
      }, 300); // Wait 300ms to detect double-click
    } else if (clickCountRef.current === 2) {
      // Double click detected
      clearTimeout(clickTimeoutRef.current);
      onDoubleClick?.();
      clickCountRef.current = 0;
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = formatDistanceToNow(updatedAt, { addSuffix: false });
  const primaryTag = contact.tags?.[0];
  const labels = conversation.labels || [];

  return (
    <div
      onClick={handleItemClick}
      className={cn(
        'conversation-item flex items-start gap-3 p-3 border-b border-border/50 cursor-pointer transition-colors',
        isSelected && 'conversation-item-active bg-primary/5',
        hasUnread && 'conversation-item-unread',
        isChecked && 'bg-primary/10'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conversation.id)}
    >
      {/* Checkbox in select mode */}
      {isSelectMode && (
        <div className="flex-shrink-0 pt-1">
          {isChecked ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Avatar with channel icon overlay */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={contact.avatar} alt={contact.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card border-2 border-card flex items-center justify-center">
          <ChannelIcon channel={channel} size={12} />
        </span>
        {contact.isOnline && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Pin indicator */}
            {conversation.is_pinned && (
              <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0 rotate-45" />
            )}
            {/* Favorite indicator */}
            {conversation.is_favorite && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            {/* Lock indicator */}
            {conversation.is_locked && (
              <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
              {contact.name}
            </span>
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

        <div className="flex items-center gap-1.5">
          {contact.company && (
            <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
          )}
          {(() => {
            const rawStatus = conversation.conversationState || conversation.context_status;
            if (!rawStatus) return null;
            const colors = getStatusColor(rawStatus);
            const label = rawStatus
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase());
            return (
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1.5 py-0 h-3.5 font-medium border cursor-pointer hover:opacity-80 transition-opacity',
                  colors.bg, colors.text, colors.border,
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onContextStatusClick?.(rawStatus);
                }}
                title={`Filter by: ${label}`}
              >
                {label}
              </Badge>
            );
          })()}
        </div>

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

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Label dots */}
            {labels.length > 0 && (
              <div className="flex items-center gap-0.5">
                {labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                    title={label.name}
                  />
                ))}
                {labels.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{labels.length - 3}</span>
                )}
              </div>
            )}

            {hasUnread && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#25D366] text-white text-xs font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
