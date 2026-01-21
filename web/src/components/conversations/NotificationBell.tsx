import { useState, memo, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChannelIcon } from './ChannelIcon';
import type { Conversation } from '@/types/conversation';
import { formatDistanceToNow } from 'date-fns';
// import notificationSoundFile from '/sounds/notification_sound.wav';

interface NotificationBellProps {
  conversations: Conversation[];
  onNotificationClick: (conversationId: string) => void;
}

// Notification sound player using actual sound file
const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification_sound.wav');
    audio.volume = 0.5;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✓ Notification sound played successfully');
          return true;
        })
        .catch((err) => {
          console.error('✗ Audio play failed:', err);
          return false;
        });
    }
    return true;
  } catch (error) {
    console.error('✗ Audio initialization failed:', error);
    return false;
  }
};

export const NotificationBell = memo(function NotificationBell({
  conversations,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prevUnreadCountRef = useRef<number>(0);

  // Get unread conversations sorted by latest message
  const unreadConversations = conversations
    .filter((c) => c.unreadCount > 0)
    .sort((a, b) => {
      const aTime = new Date(a.messages[a.messages.length - 1]?.timestamp || 0).getTime();
      const bTime = new Date(b.messages[b.messages.length - 1]?.timestamp || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 10);

  const totalUnread = unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Play sound when unread count increases
  useEffect(() => {
    if (totalUnread > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
      playNotificationSound();
    }
    prevUnreadCountRef.current = totalUnread;
  }, [totalUnread]);

  const handleNotificationClick = (id: string) => {
    onNotificationClick(id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {totalUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
            >
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                {totalUnread > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <ScrollArea className="max-h-[400px]">
                {unreadConversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {unreadConversations.map((conversation) => {
                      const lastMessage = conversation.messages[conversation.messages.length - 1];
                      return (
                        <button
                          key={conversation.id}
                          onClick={() => handleNotificationClick(conversation.id)}
                          className="w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {conversation.contact.avatar ? (
                                <img
                                  src={conversation.contact.avatar}
                                  alt={conversation.contact.name}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                conversation.contact.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5">
                              <ChannelIcon channel={conversation.channel} size={12} />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-foreground truncate">
                                {conversation.contact.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {lastMessage && formatDistanceToNow(lastMessage.timestamp instanceof Date ? lastMessage.timestamp : new Date(lastMessage.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {lastMessage?.content || 'No messages'}
                            </p>
                            {conversation.unreadCount > 1 && (
                              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                +{conversation.unreadCount - 1} more
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
