import { memo, useState } from 'react';
import { Message } from '@/types/conversation';
import { Check, CheckCheck, Clock, AlertCircle, X, UserCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MrLadAvatar } from './MrLadAvatar';

// ── Template message renderer ─────────────────────────────────────────────────
// Parses "[Template: <name>] <param>" stored format into a styled card
function TemplateMessageBubble({ content }: { content: string }) {
  // Parse format: "[Template: onboard_new_member] John Doe"
  const match = content.match(/^\[Template:\s*([^\]]+)\]\s*(.*)?$/s);
  if (!match) return <p className="wa-msg-text">{content}</p>;

  const templateName = match[1].trim();
  const params = match[2]?.trim() || '';

  // Map template names to human-friendly labels
  const templateLabels: Record<string, { label: string; description: string }> = {
    onboard_new_member: {
      label: 'Welcome Message',
      description: `Sent onboarding welcome message${params ? ` to ${params}` : ''}`,
    },
  };

  const meta = templateLabels[templateName] || {
    label: templateName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: params ? `Parameters: ${params}` : 'Template message sent',
  };

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      {/* Template badge */}
      <div className="flex items-center gap-1.5 pb-1 border-b border-white/20">
        <MessageSquare className="w-3 h-3 opacity-70 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          {meta.label}
        </span>
      </div>
      {/* Template description */}
      <p className="wa-msg-text text-[13px] leading-snug">{meta.description}</p>
    </div>
  );
}

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  email?: string;
}

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  contact?: Contact;
  onAgentClick?: (agentId?: string) => void;
}

const statusIcons = {
  sent: Clock,
  delivered: Check,
  read: CheckCheck,
  failed: AlertCircle,
};

// ── Avatar components ────────────────────────────────────────────────────────

/** MR LAD animated visualizer — shown for AI-generated messages */
function AiAvatar() {
  return <MrLadAvatar size={32} className="ring-1 ring-[#5b7fe8]/30" />;
}

/** Lead avatar — WhatsApp profile pic or first letter of name */
function LeadAvatar({ contact }: { contact?: Contact }) {
  const initial = contact?.name ? contact.name.charAt(0).toUpperCase() : 'L';
  return (
    <Avatar className="flex-shrink-0 w-8 h-8">
      {contact?.avatar && <AvatarImage src={contact.avatar} alt={contact.name} />}
      <AvatarFallback className="text-xs font-semibold bg-emerald-100 text-emerald-700">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

/** Human agent avatar — first letter, clickable to open profile */
function AgentAvatar({
  name,
  agentId,
  onClick,
}: {
  name?: string;
  agentId?: string;
  onClick?: (agentId?: string) => void;
}) {
  const initial = name ? name.charAt(0).toUpperCase() : 'H';
  return (
    <button
      className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold ring-1 ring-violet-200 hover:ring-violet-400 hover:bg-violet-200 transition-all cursor-pointer"
      onClick={() => onClick?.(agentId)}
      title={`${name || 'Human Agent'} — click to view profile`}
      aria-label="Open agent profile"
    >
      {initial}
    </button>
  );
}

// ── Agent Profile Popover ─────────────────────────────────────────────────────

function AgentProfilePopover({
  name,
  agentId,
  onClose,
  onViewAssignment,
}: {
  name?: string;
  agentId?: string;
  onClose: () => void;
  onViewAssignment?: () => void;
}) {
  const displayName = name || 'Human Agent';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="absolute z-50 bottom-10 left-0 w-56 bg-popover border border-border rounded-xl shadow-lg p-3 text-sm"
      role="dialog"
      aria-label="Agent profile"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Human Agent
        </span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Agent details */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold ring-1 ring-violet-200">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {agentId && (
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              ID: {agentId.substring(0, 8)}…
            </p>
          )}
        </div>
      </div>

      {/* Action */}
      {onViewAssignment && (
        <button
          onClick={() => {
            onViewAssignment();
            onClose();
          }}
          className="w-full flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <UserCircle className="h-3.5 w-3.5" />
          View assignment details
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const MessageBubble = memo(function MessageBubble({
  message,
  showAvatar = true,
  contact,
  onAgentClick,
}: MessageBubbleProps) {
  const { content, timestamp, isOutgoing, status, sender, role } = message;
  const StatusIcon = statusIcons[status];

  const [showAgentProfile, setShowAgentProfile] = useState(false);

  // Determine the sender category
  const isAI = isOutgoing && role !== 'human_agent';
  const isHumanAgent = isOutgoing && role === 'human_agent';
  const isLead = !isOutgoing;

  const handleAgentAvatarClick = (agentId?: string) => {
    if (onAgentClick) {
      onAgentClick(agentId);
    } else {
      setShowAgentProfile((v) => !v);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-2 animate-message-pop',
        isOutgoing ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* ── Incoming-side avatar (lead or nothing) ── */}
      {showAvatar && isLead && <LeadAvatar contact={contact} />}

      {/* ── Outgoing-side avatar (AI or human agent) ── */}
      {showAvatar && isOutgoing && (
        <div className="relative">
          {isAI ? (
            <AiAvatar />
          ) : (
            <>
              <AgentAvatar
                name={message.senderName || sender.name}
                agentId={message.humanAgentId}
                onClick={handleAgentAvatarClick}
              />
              {showAgentProfile && !onAgentClick && (
                <AgentProfilePopover
                  name={message.senderName || sender.name}
                  agentId={message.humanAgentId}
                  onClose={() => setShowAgentProfile(false)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Message bubble ── */}
      <div
        className={cn(
          'max-w-[72%] px-3 py-[6px] shadow-sm',
          isOutgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming'
        )}
      >
        {/* Sender label for human-agent messages */}
        {isHumanAgent && (
          <p className="text-[10px] font-semibold text-violet-400 mb-0.5 uppercase tracking-wide">
            {message.senderName || sender.name || 'Agent'}
          </p>
        )}

        {/* Message text — template messages get a styled card, others plain text */}
        {content?.startsWith('[Template:') ? (
          <TemplateMessageBubble content={content} />
        ) : (
          <p className="wa-msg-text">{content}</p>
        )}

        {/* Timestamp + status row */}
        <div
          className={cn(
            'flex items-center gap-1 mt-0.5 -mb-0.5',
            isOutgoing ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'wa-msg-time',
              isOutgoing ? 'text-white/60' : 'text-[#667781]'
            )}
          >
            {format(timestamp, 'h:mm a')}
          </span>
          {isOutgoing && StatusIcon && (
            <StatusIcon
              className={cn(
                'h-3 w-3',
                status === 'read'
                  ? 'text-blue-300'
                  : status === 'failed'
                  ? 'text-red-400'
                  : 'text-white/50'
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
});
