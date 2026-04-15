import { memo, useMemo, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/types/conversation';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { isSameDay } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  conversationId?: string;
  isAgentTyping?: boolean;
}

interface ListItem {
  type: 'message' | 'date';
  data: Message | Date;
  key: string;
}

// ── Typing indicator bubble ───────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="px-4 py-1">
      <div className="flex items-end gap-1 max-w-[70%]">
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export const MessageList = memo(function MessageList({ messages, conversationId, isAgentTyping }: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Build list with date separators
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let lastDate: Date | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp);

      // Add date separator if day changed
      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        items.push({
          type: 'date',
          data: messageDate,
          key: `date-${messageDate.toISOString()}`,
        });
        lastDate = messageDate;
      }

      items.push({
        type: 'message',
        data: message,
        key: message.id,
      });
    });

    return items;
  }, [messages]);

  // Derive the ID of the last (newest) message so we can scroll when it changes.
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  // Scroll to bottom whenever:
  //  • The conversation changes (conversationId)
  //  • A new message arrives (lastMessageId changes)
  //  • The total item count changes (date separators added)
  // Using 'auto' for conversation switches (instant jump) and 'smooth' for
  // new messages (visible animation).
  useEffect(() => {
    if (!virtuosoRef.current || listItems.length === 0) return;
    virtuosoRef.current.scrollToIndex({
      index: listItems.length - 1,
      behavior: 'auto',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // instant jump when conversation switches

  useEffect(() => {
    if (!virtuosoRef.current || listItems.length === 0) return;
    virtuosoRef.current.scrollToIndex({
      index: listItems.length - 1,
      behavior: 'smooth',
    });
  }, [lastMessageId, listItems.length]); // smooth scroll on new message or count change

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isAgentTyping && virtuosoRef.current && listItems.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: listItems.length - 1, behavior: 'smooth' });
    }
  }, [isAgentTyping]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemContent = (index: number) => {
    const item = listItems[index];

    if (item.type === 'date') {
      return <DateSeparator date={item.data as Date} />;
    }

    return (
      <div className="px-4 py-1">
        <MessageBubble message={item.data as Message} />
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden whatsapp-chat-bg flex flex-col">
      <Virtuoso
        ref={virtuosoRef}
        style={{ flex: 1 }}
        totalCount={listItems.length}
        itemContent={itemContent}
        followOutput="smooth"
        alignToBottom
        className="custom-scrollbar"
        initialTopMostItemIndex={listItems.length - 1}
      />
      {isAgentTyping && <TypingIndicator />}
    </div>
  );
});
