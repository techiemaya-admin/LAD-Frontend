import { memo, useMemo, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/types/conversation';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { isSameDay } from 'date-fns';

interface MessageListProps {
  messages: Message[];
}

interface ListItem {
  type: 'message' | 'date';
  data: Message | Date;
  key: string;
}

export const MessageList = memo(function MessageList({ messages }: MessageListProps) {
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (virtuosoRef.current && listItems.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: listItems.length - 1,
        behavior: 'smooth',
      });
    }
  }, [listItems.length]);

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
    <div className="flex-1 overflow-hidden bg-background/50">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        totalCount={listItems.length}
        itemContent={itemContent}
        followOutput="smooth"
        alignToBottom
        className="custom-scrollbar"
        initialTopMostItemIndex={listItems.length - 1}
      />
    </div>
  );
});
