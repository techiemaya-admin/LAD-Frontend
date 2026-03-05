"use client";
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversations } from '@/features/conversations/useConversations';
import { ConversationSidebar } from './ConversationSidebar';
import { RealChatWindow } from './RealChatWindow';
import { ConversationContextPanel } from './ConversationContextPanel';
import { NotificationBell } from './NotificationBell';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

export function ConversationsPage() {
  const {
    conversations,
    selectedConversation,
    selectedId,
    selectConversation,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
    allConversations,
    messages,
    messagesLoading,
  } = useConversations();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleContextPanel = useCallback(() => {
    setIsContextPanelOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = useCallback((conversationId: string) => {
    selectConversation(conversationId);
  }, [selectConversation]);

  // Adapt real conversations into the old Conversation shape so the sidebar/list-item works
  const adaptedConversations = conversations.map(c => ({
    id: c.id,
    channel: 'linkedin' as const,
    contact: {
      id: c.leadId,
      name: c.leadName || 'Unknown',
      avatar: (c.leadAvatarUrl && c.leadAvatarUrl !== 'none') ? c.leadAvatarUrl : '',
      email: c.leadEmail || '',
      company: c.accountName || '',
      position: c.leadHeadline || '',
      tags: (c.hasReply ? ['warm'] : []) as any[],
      notes: [],
      isOnline: false,
    },
    messages: [],
    lastMessage: c.lastMessage
      ? {
        id: `lm-${c.id}`,
        conversationId: c.id,
        content: c.lastMessage.text || '',
        timestamp: new Date(c.lastMessage.createdAt),
        isOutgoing: c.lastMessage.direction === 'OUTGOING',
        status: 'delivered' as const,
        sender: { id: c.leadId, name: c.leadName },
      }
      : undefined,
    unreadCount: c.unread || 0,
    status: (c.status === 'resolved' ? 'resolved' : 'open') as any,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }));

  // Adapt for NotificationBell (it expects the old Conversation shape — pass dummy)
  const notifConversations = allConversations.map(c => ({
    id: c.id,
    unreadCount: c.unread,
    contact: { id: c.leadId, name: c.leadName, email: '', tags: [], notes: [] },
    channel: 'linkedin' as const,
    messages: c.lastMessage
      ? [{
        id: `notif-${c.id}`,
        conversationId: c.id,
        content: c.lastMessage.text || '',
        timestamp: new Date(c.lastMessage.createdAt),
        isOutgoing: c.lastMessage.direction === 'OUTGOING',
        status: 'delivered' as const,
        sender: { id: c.leadId, name: c.leadName },
      }]
      : [],
    lastMessage: c.lastMessage ? { content: c.lastMessage.text } : null,
    status: 'open' as const,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  })) as any[];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with notification bell */}
      <div className="flex items-center justify-end px-4 py-3 border-b border-border bg-white">
        <NotificationBell
          conversations={notifConversations}
          onNotificationClick={handleNotificationClick}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full flex-shrink-0 overflow-hidden hidden lg:block"
            >
              <ConversationSidebar
                conversations={adaptedConversations}
                selectedId={selectedId}
                onSelectConversation={(id) => selectConversation(String(id))}
                channelFilter={channelFilter as any}
                onChannelFilterChange={(ch) => setChannelFilter(ch)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                unreadCounts={unreadCounts as any}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={toggleSidebar}
            >
              <motion.div
                initial={{ x: -340 }}
                animate={{ x: 0 }}
                exit={{ x: -340 }}
                transition={{ duration: 0.2 }}
                className="w-[340px] h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <ConversationSidebar
                  conversations={adaptedConversations}
                  selectedId={selectedId}
                  onSelectConversation={(id) => {
                    selectConversation(String(id));
                    setIsSidebarCollapsed(true);
                  }}
                  channelFilter={channelFilter as any}
                  onChannelFilterChange={(ch) => setChannelFilter(ch)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  unreadCounts={unreadCounts}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed sidebar toggle (desktop) */}
        {isSidebarCollapsed && (
          <div className="hidden lg:flex flex-col items-center py-3 px-2 bg-card border-r border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleSidebar}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Main Chat Area — REAL messages */}
        <RealChatWindow
          conversation={selectedConversation}
          messages={messages}
          messagesLoading={messagesLoading}
          onMarkResolved={markAsResolved}
          onMute={muteConversation}
          onSendMessage={sendMessage}
          onTogglePanel={toggleContextPanel}
          isPanelOpen={isContextPanelOpen}
        />

        {/* Context Panel */}
        <AnimatePresence mode="wait">
          {isContextPanelOpen && selectedConversation && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full flex-shrink-0 overflow-hidden hidden md:block"
            >
              <ConversationContextPanel
                conversation={{
                  id: selectedConversation.id,
                  channel: 'linkedin',
                  contact: {
                    id: selectedConversation.leadId,
                    name: selectedConversation.leadName || 'Unknown',
                    email: selectedConversation.leadEmail || '',
                    phone: selectedConversation.leadPhone || undefined,
                    company: selectedConversation.accountName || undefined,
                    position: '',
                    tags: [],
                    notes: [],
                  },
                  messages: [],
                  unreadCount: selectedConversation.unread || 0,
                  status: 'open',
                  createdAt: new Date(selectedConversation.createdAt),
                  updatedAt: new Date(selectedConversation.updatedAt),
                } as any}
                onClose={toggleContextPanel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
