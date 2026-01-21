import { memo } from 'react';
import { Conversation } from '@/types/conversation';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { MessageSquare } from 'lucide-react';

interface ChatWindowProps {
  conversation: Conversation | null;
  onMarkResolved: (id: string) => void;
  onMute: (id: string) => void;
  onSendMessage: (content: string) => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

export const ChatWindow = memo(function ChatWindow({
  conversation,
  onMarkResolved,
  onMute,
  onSendMessage,
  onTogglePanel,
  isPanelOpen,
}: ChatWindowProps) {
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-1">Select a conversation</h3>
        <p className="text-sm">Choose from your conversations on the left</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background/50">
      <ChatHeader
        conversation={conversation}
        onMarkResolved={() => onMarkResolved(conversation.id)}
        onMute={() => onMute(conversation.id)}
        onTogglePanel={onTogglePanel}
        isPanelOpen={isPanelOpen}
      />
      <MessageList messages={conversation.messages} />
      <MessageComposer
        channel={conversation.channel}
        onSendMessage={onSendMessage}
        disabled={conversation.status === 'resolved'}
      />
    </div>
  );
});
