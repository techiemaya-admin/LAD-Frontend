import { memo, useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/types/conversation';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { isSameDay } from 'date-fns';
import { Loader2, ChevronUp } from 'lucide-react';
import { getConversationFeedback } from '@lad/frontend-features/conversations';

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  email?: string;
}

interface MessageListProps {
  messages: Message[];
  conversationId?: string;
  isAgentTyping?: boolean;
  contact?: Contact;
  onAgentClick?: (agentId?: string) => void;
  onDeleteMessage?: (message: Message, scope: 'me' | 'everyone') => void;
  onToggleStar?: (message: Message) => void;
  /** Whether older messages exist beyond the current window */
  hasMore?: boolean;
  /** Whether older messages are currently being fetched */
  isLoadingMore?: boolean;
  /** Called when the user scrolls to the top or clicks "Load older messages" */
  onLoadMore?: () => void;
  searchText?: string;
  highlightedMessageId?: string;
}

interface ListItem {
  type: 'message' | 'date';
  data: Message | Date;
  key: string;
}

// ── Typing indicator bubble ───────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="px-3 py-1">
      <div className="flex items-end gap-1.5 max-w-[70%]">
        <div
          className="flex items-center gap-[5px] px-3 py-2.5 shadow-sm"
          style={{
            background: '#ffffff',
            borderRadius: '0 8px 8px 8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#8696a0] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[#8696a0] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#8696a0] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ── "Load older messages" header ──────────────────────────────────────────────
function LoadOlderHeader({
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center py-3">
      <button
        onClick={onLoadMore}
        disabled={isLoadingMore}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm"
      >
        {isLoadingMore ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
        {isLoadingMore ? 'Loading…' : 'Load older messages'}
      </button>
    </div>
  );
}

export const MessageList = memo(function MessageList({
  messages,
  conversationId,
  isAgentTyping,
  contact,
  onAgentClick,
  onDeleteMessage,
  onToggleStar,
  hasMore,
  isLoadingMore,
  onLoadMore,
  searchText,
  highlightedMessageId,
}: MessageListProps) {
  // Existing verdicts for this thread, so reopening it doesn't reset the
  // thumbs. Best-effort: feedback is an enhancement, and failing to load it
  // must never stop messages rendering.
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, 'like' | 'dislike'>>({});
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    getConversationFeedback(conversationId)
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, 'like' | 'dislike'> = {};
        for (const r of rows) map[String(r.message_id)] = r.rating;
        setFeedbackByMessage(map);
      })
      .catch(() => { /* non-fatal - thumbs simply start unset */ });
    return () => { cancelled = true; };
  }, [conversationId]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Build list items: prepend the "load older" header item, then date + messages
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let lastDate: Date | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp);
      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        items.push({
          type: 'date',
          data: messageDate,
          key: `date-${messageDate.toISOString()}`,
        });
        lastDate = messageDate;
      }
      items.push({ type: 'message', data: message, key: message.id });
    });

    return items;
  }, [messages]);

  // Scroll to bottom on conversation switch (instant)
  useEffect(() => {
    if (!virtuosoRef.current || listItems.length === 0) return;
    virtuosoRef.current.scrollToIndex({ index: listItems.length - 1, behavior: 'auto' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isAgentTyping && virtuosoRef.current && listItems.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: listItems.length - 1, behavior: 'smooth' });
    }
  }, [isAgentTyping]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to highlighted message when it changes
  useEffect(() => {
    if (!highlightedMessageId || !virtuosoRef.current) return;
    const index = listItems.findIndex(
      (item) => item.type === 'message' && (item.data as Message).id === highlightedMessageId
    );
    if (index !== -1) {
      virtuosoRef.current.scrollToIndex({
        index,
        behavior: 'smooth',
        align: 'center',
      });
    }
  }, [highlightedMessageId, listItems]);

  // When older messages finish loading, stay at the same position (don't jump)
  // Virtuoso handles this automatically when prepending via prependItemCount

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      onLoadMore?.();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const itemContent = (index: number) => {
    const item = listItems[index];
    if (item.type === 'date') {
      return <DateSeparator date={item.data as Date} variant="whatsapp" />;
    }
    const msg = item.data as Message;
    return (
      <div className="px-4 lg:px-8 py-[3px]">
        <MessageBubble
          message={msg}
          conversationId={conversationId}
          feedbackRating={feedbackByMessage[String(msg.id)] ?? null}
          contact={contact}
          onAgentClick={onAgentClick}
          onDeleteMessage={onDeleteMessage}
          onToggleStar={onToggleStar}
          searchText={searchText}
          isHighlighted={msg.id === highlightedMessageId}
        />
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden bg-transparent flex flex-col mx-10">
      <Virtuoso
        ref={virtuosoRef}
        style={{ flex: 1 }}
        totalCount={listItems.length}
        itemContent={itemContent}
        followOutput="auto"
        alignToBottom
        className="custom-scrollbar"
        initialTopMostItemIndex={listItems.length - 1}
        startReached={handleStartReached}
        components={{
          Header: () => (
            <LoadOlderHeader
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={onLoadMore}
            />
          ),
        }}
      />
      {isAgentTyping && <TypingIndicator />}
    </div>
  );
});
