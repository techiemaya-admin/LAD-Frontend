import { memo } from 'react';
import { Message } from '@/types/conversation';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
}

const statusIcons = {
  sent: Clock,
  delivered: Check,
  read: CheckCheck,
  failed: AlertCircle,
};

export const MessageBubble = memo(function MessageBubble({
  message,
  showAvatar = true,
}: MessageBubbleProps) {
  const { content, timestamp, isOutgoing, status, sender } = message;
  const StatusIcon = statusIcons[status];

  const initials = sender.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'flex gap-2 animate-message-pop',
        isOutgoing ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar placeholder for alignment */}
      {showAvatar && !isOutgoing && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {initials}
        </div>
      )}
      {showAvatar && isOutgoing && <div className="w-8" />}

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[70%] px-4 py-2.5 shadow-sm',
          isOutgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOutgoing ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-[10px]',
              isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {format(timestamp, 'h:mm a')}
          </span>
          {isOutgoing && (
            <StatusIcon
              className={cn(
                'h-3 w-3',
                status === 'read'
                  ? 'text-info'
                  : status === 'failed'
                  ? 'text-destructive'
                  : 'text-primary-foreground/70'
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
});
