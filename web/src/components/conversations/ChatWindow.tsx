import { memo } from 'react';
import { Conversation } from '@/types/conversation';
import { useConversationMessages } from '@lad/frontend-features/conversations';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { MessageSquare, Loader2 } from 'lucide-react';

interface ChatWindowProps {
  conversation: Conversation | null;
  onMarkResolved: (id: string) => void;
  onMute: (id: string) => void;
  onSendMessage: (content: string) => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  backendChannel?: 'personal' | 'waba';
  onPin?: (id: string) => void;
  onLock?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onExport?: (id: string) => void;
  onBlock?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ChatWindow = memo(function ChatWindow({
  conversation,
  onMarkResolved,
  onMute,
  onSendMessage,
  onTogglePanel,
  isPanelOpen,
  backendChannel,
  onPin,
  onLock,
  onFavorite,
  onExport,
  onBlock,
  onDelete,
}: ChatWindowProps) {
  // Fetch messages from backend — pass backendChannel so messages route to
  // the correct service (personal → LAD_backend, waba → LAD-WABA-Comms).
  const { messages, isLoading: messagesLoading } = useConversationMessages(
    conversation?.id || null,
    undefined,
    backendChannel
  );

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
    <div className="flex-1 flex flex-col min-w-0 whatsapp-chat-bg">
      <ChatHeader
        conversation={conversation}
        onMarkResolved={() => onMarkResolved(conversation.id)}
        onMute={() => onMute(conversation.id)}
        onTogglePanel={onTogglePanel}
        isPanelOpen={isPanelOpen}
        onPin={() => onPin?.(conversation.id)}
        onLock={() => onLock?.(conversation.id)}
        onFavorite={() => onFavorite?.(conversation.id)}
        onExport={() => onExport?.(conversation.id)}
        onBlock={() => onBlock?.(conversation.id)}
        onDelete={() => onDelete?.(conversation.id)}
      />
      {messagesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MessageList messages={messages.length > 0 ? messages : conversation.messages} />
      )}
      <MessageComposer
        channel={conversation.channel}
        onSendMessage={onSendMessage}
        disabled={conversation.status === 'resolved'}
        contactName={conversation.contact?.name}
        conversationId={conversation.id}
        owner={conversation.owner}
      />
    </div>
  );
});
