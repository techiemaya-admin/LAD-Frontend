"use client";
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversations } from '@/hooks/useConversations';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatWindow } from './ChatWindow';
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with notification bell */}
      <div className="flex items-center justify-end px-4 py-3 border-b border-border bg-white">
        <NotificationBell
          conversations={allConversations}
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
                conversations={conversations}
                selectedId={selectedId}
                onSelectConversation={selectConversation}
                channelFilter={channelFilter}
                onChannelFilterChange={setChannelFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                unreadCounts={unreadCounts}
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
                  conversations={conversations}
                  selectedId={selectedId}
                  onSelectConversation={(id) => {
                    selectConversation(id);
                    setIsSidebarCollapsed(true);
                  }}
                  channelFilter={channelFilter}
                  onChannelFilterChange={setChannelFilter}
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

        {/* Main Chat Area */}
        <ChatWindow
          conversation={selectedConversation}
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
                conversation={selectedConversation}
                onClose={toggleContextPanel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
