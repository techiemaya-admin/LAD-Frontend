import { memo, useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  InboxIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Clock,
  Search,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface InboxMessage {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  contact_name: string;
  contact_phone: string;
  message_preview: string;
  is_read: boolean;
  received_at: string;
  conversation_status?: string;
}

interface ConversationDetail {
  id: string;
  contact: {
    name: string;
    phone: string;
  };
  latest_message?: string;
}

export const UserInbox = memo(function UserInbox() {
  // State
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [marking, setMarking] = useState(false);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  // Load inbox messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTenant('/api/me/inbox?limit=50&offset=0');

      if (!response.ok) {
        throw new Error('Failed to load inbox messages');
      }

      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error('Error loading inbox:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inbox messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        setMarking(true);

        const response = await fetchWithTenant(
          `/api/inbox/${messageId}/read`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to mark message as read');
        }

        // Update local state
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      } catch (err) {
        console.error('Error marking message as read:', err);
      } finally {
        setMarking(false);
      }
    },
    []
  );

  // Handle message click - open conversation
  const handleOpenConversation = useCallback(async (message: InboxMessage) => {
    if (!message.is_read) {
      await markAsRead(message.id);
    }
    setSelectedMessage(message);
    setOpenConversationId(message.conversation_id);
  }, [markAsRead]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Filter messages
  const filteredMessages = messages.filter((msg) =>
    msg.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.contact_phone.includes(searchQuery)
  );

  const unreadCount = messages.filter((msg) => !msg.is_read).length;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">My Inbox</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMessages()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-10 h-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex gap-2 p-4 bg-destructive/10 border-b border-destructive/20 mx-4 my-2 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <InboxIcon className="h-12 w-12 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">
              {messages.length === 0
                ? 'No inbox messages yet'
                : 'No messages match your search'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => handleOpenConversation(message)}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                  !message.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {message.contact_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={`text-sm font-medium truncate ${
                        !message.is_read ? 'font-semibold' : ''
                      }`}>
                        {message.contact_name}
                      </p>
                      {!message.is_read && (
                        <Badge variant="default" className="text-[10px] h-5">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {message.contact_phone}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {message.message_preview}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(message.received_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Details Dialog */}
      {selectedMessage && (
        <AlertDialog
          open={!!selectedMessage}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMessage(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {selectedMessage.contact_name}
            </AlertDialogTitle>

            <AlertDialogDescription className="space-y-4">
              {/* Contact info */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="text-xs">
                  <p className="text-muted-foreground">Phone:</p>
                  <p className="font-medium">{selectedMessage.contact_phone}</p>
                </div>
                <div className="text-xs">
                  <p className="text-muted-foreground">Received:</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(selectedMessage.received_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Message:</p>
                <p className="text-sm bg-primary/5 p-3 rounded-lg whitespace-pre-wrap break-words">
                  {selectedMessage.message_preview}
                </p>
              </div>
            </AlertDialogDescription>

            <div className="flex gap-2 justify-end">
              <AlertDialogCancel className="text-xs">Close</AlertDialogCancel>
              <AlertDialogAction className="text-xs">
                <ArrowRight className="h-3 w-3 mr-1.5" />
                Open Conversation
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
});
