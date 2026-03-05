"use client";
import { useConversations } from '@lad/frontend-features/conversations';
import { NotificationBell } from './conversations/NotificationBell';
import { useEffect, useState } from 'react';

export function TopHeader() {
  const { allConversations, selectConversation } = useConversations();
  const [isHydrated, setIsHydrated] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="fixed top-0 left-0 right-0 h-14 z-40 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-b border-border flex items-center justify-between px-4 md:px-8">
        <div className="flex-1" />
        <div className="flex items-center gap-4" />
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-14 z-40 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-b border-border flex items-center justify-between px-4 md:px-8">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <NotificationBell
          conversations={allConversations}
          onNotificationClick={(conversationId) => selectConversation(conversationId)}
        />
      </div>
    </div>
  );
}
