import { memo, useState } from 'react';
import { Message } from '@/types/conversation';
import { Check, CheckCheck, Clock, AlertCircle, X, UserCircle, MessageSquare, MapPin, FileText, Music, Video, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MrLadAvatar } from './MrLadAvatar';

// ── Location card renderer ───────────────────────────────────────────────────
function LocationCard({
  latitude,
  longitude,
  name,
  address,
}: {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}) {
  const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
  const displayName = name || address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-xs rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
    >
      {/* Static map thumbnail */}
      <div className="relative bg-gray-800 h-32 flex items-end justify-center">
        <img
          src={`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x140&markers=color:red%7C${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`}
          alt="Location"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if map image fails to load
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
          }}
        />
        {/* Location pin overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MapPin className="w-8 h-8 text-red-500 drop-shadow-lg" fill="currentColor" />
        </div>
      </div>

      {/* Location name */}
      <div className="bg-gray-900 px-3 py-2 text-white text-sm">
        <div className="font-semibold truncate">{displayName}</div>
        <div className="text-xs text-gray-400 mt-0.5">{latitude.toFixed(6)}, {longitude.toFixed(6)}</div>
      </div>
    </a>
  );
}

// ── Plain-text renderer with clickable URLs ───────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s]+/g;

function TextWithLinks({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <div className={cn('wa-msg-text whitespace-pre-line', className)}>
      {lines.map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        const regex = new RegExp(URL_REGEX.source, 'g');
        while ((match = regex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
          }
          const url = match[0];
          parts.push(
            <a
              key={match.index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all"
            >
              {url}
            </a>
          );
          lastIndex = match.index + url.length;
        }
        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }
        return <div key={lineIdx}>{parts.length > 0 ? parts : line}</div>;
      })}
    </div>
  );
}

// ── Inbound media renderer ────────────────────────────────────────────────────
function MediaCard({
  mediaId,
  mediaType,
  mediaMimeType,
  mediaFilename,
  mediaCaption,
}: {
  mediaId: string;
  mediaType: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaCaption?: string;
}) {
  const mediaUrl = `/api/whatsapp-conversations/conversations/media/${mediaId}`;
  const isImage = mediaType === 'image' || (mediaMimeType?.startsWith('image/') ?? false);
  const isVideo = mediaType === 'video' || (mediaMimeType?.startsWith('video/') ?? false);
  const isAudio = mediaType === 'audio' || (mediaMimeType?.startsWith('audio/') ?? false);
  const isDocument = mediaType === 'document' || (!isImage && !isVideo && !isAudio);

  if (isImage) {
    return (
      <div className="flex flex-col gap-1">
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={mediaUrl}
            alt={mediaCaption || 'Photo'}
            className="max-w-[260px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
        {mediaCaption && <p className="text-[13px] wa-msg-text">{mediaCaption}</p>}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="flex flex-col gap-1">
        <video
          src={mediaUrl}
          controls
          className="max-w-[260px] rounded-lg"
          preload="metadata"
        />
        {mediaCaption && <p className="text-[13px] wa-msg-text">{mediaCaption}</p>}
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="flex items-center gap-2 px-1 py-1">
        <Music className="w-4 h-4 shrink-0 opacity-70" />
        <audio src={mediaUrl} controls className="h-8 max-w-[200px]" />
      </div>
    );
  }

  // Document / fallback
  const filename = mediaFilename || 'Document';
  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={filename}
      className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
    >
      <FileText className="w-5 h-5 shrink-0 opacity-80" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{filename}</p>
        {mediaMimeType && (
          <p className="text-[10px] opacity-60 truncate">{mediaMimeType}</p>
        )}
      </div>
      <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
    </a>
  );
}

// ── Template message renderer ─────────────────────────────────────────────────
// Shows a labelled badge above the actual rendered message text
function TemplateMessageBubble({ content, templateName }: { content: string; templateName: string }) {
  const LABELS: Record<string, string> = {
    cohesion_report_no_interaction: 'Cohesion Report',
    member_121_recommendations:     '1-2-1 Recommendations',
    onboard_new_member:             'Welcome Message',
  };
  const label = LABELS[templateName]
    ?? templateName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      {/* Template badge */}
      <div className="flex items-center gap-1.5 pb-1 border-b border-white/20">
        <MessageSquare className="w-3 h-3 opacity-70 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      {/* Actual message text with line-breaks preserved */}
      <p className="wa-msg-text text-[13px] leading-snug whitespace-pre-line">{content}</p>
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

        {/* Message content — template, media, location, or plain text */}
        {message.templateName ? (
          <TemplateMessageBubble content={content} templateName={message.templateName} />
        ) : message.mediaId ? (
          <MediaCard
            mediaId={message.mediaId}
            mediaType={message.mediaType || 'document'}
            mediaMimeType={message.mediaMimeType}
            mediaFilename={message.mediaFilename}
            mediaCaption={message.mediaCaption}
          />
        ) : message.latitude != null && message.longitude != null ? (
          <div className="flex flex-col gap-3">
            {/* Location card with map preview */}
            <LocationCard
              latitude={message.latitude}
              longitude={message.longitude}
              name={message.locationName}
              address={message.locationAddress}
            />
            {/* Clickable map links */}
            <TextWithLinks text={content} className="text-sm" />
          </div>
        ) : (
          <TextWithLinks text={content} />
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
