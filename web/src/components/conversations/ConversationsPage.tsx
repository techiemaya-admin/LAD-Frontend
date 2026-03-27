"use client";
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useConversations } from '@lad/frontend-features/conversations';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatWindow } from './ChatWindow';
import { GroupChatWindow } from './GroupChatWindow';
import { ConversationContextPanel } from './ConversationContextPanel';
import { AIPlayground } from './AIPlayground';
import type { ChatGroup } from './ChatGroupManager';
import type { Conversation, Channel } from '@/types/conversation';
import { Button } from '@/components/ui/button';
import { PanelLeft, FlaskConical } from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { ChannelIcon } from './ChannelIcon';
import { cn } from '@/lib/utils';

const CONV_API = '/api/whatsapp-conversations/conversations';

// ─────────────────────────────────────────────────────────────────────────────
// Inner view — one instance per tab, fully independent hook + state
// ─────────────────────────────────────────────────────────────────────────────
function ChannelConversationView({ channel }: { channel: 'personal' | 'waba' }) {
  const queryClient = useQueryClient();
  const {
    conversations,
    selectedConversation,
    selectedId,
    selectConversation,
    channelFilter,
    setChannelFilter,
    contextStatusFilter,
    setContextStatusFilter,
    searchQuery,
    setSearchQuery,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
  } = useConversations({ channel });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [groupMemberSelected, setGroupMemberSelected] = useState(false);
  const [groupInfoAutoOpen, setGroupInfoAutoOpen] = useState(false);

  const handleSelectGroup = useCallback((group: ChatGroup) => {
    setActiveGroup(group);
    setGroupMemberSelected(false);
    setGroupInfoAutoOpen(false);
  }, []);

  const handleOpenGroupInfo = useCallback((group: ChatGroup) => {
    setActiveGroup(group);
    setGroupMemberSelected(false);
    setGroupInfoAutoOpen(true);
  }, []);

  const handleBackFromGroup = useCallback(() => {
    setActiveGroup(null);
    setGroupMemberSelected(false);
    setGroupInfoAutoOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    selectConversation(id);
    if (activeGroup) setGroupMemberSelected(true);
  }, [selectConversation, activeGroup]);

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((p) => !p), []);
  const toggleContextPanel = useCallback(() => setIsContextPanelOpen((p) => !p), []);

  // ── CRM actions — fetchWithTenant already sends ?channel= from localStorage,
  //    but we explicitly append it here so actions go to the right backend.
  const withChannel = useCallback(
    (url: string) => `${url}${url.includes('?') ? '&' : '?'}channel=${channel}`,
    [channel]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
  }, [queryClient]);

  const handlePin = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`${CONV_API}/${id}/pin`), { method: 'PATCH' });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleLock = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`${CONV_API}/${id}/lock`), { method: 'PATCH' });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleFavorite = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`${CONV_API}/${id}/favorite`), { method: 'PATCH' });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleExport = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`/api/whatsapp-conversations/conversations/${id}/messages`));
      const data = await res.json();
      if (!data.success) return;
      const lines = (data.data || []).map(
        (m: { role: string; content: string; created_at: string }) =>
          `[${m.created_at || ''}] ${m.role}: ${m.content}`
      );
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, [withChannel]);

  const handleBlock = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`${CONV_API}/${id}/status`), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`${CONV_API}/${id}`), { method: 'DELETE' });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleBulkAction = useCallback(async (action: string, ids: string[]) => {
    try {
      let res: Response | undefined;
      if (action === 'resolve') {
        res = await fetchWithTenant(withChannel(`${CONV_API}/bulk`), {
          method: 'POST',
          body: JSON.stringify({ action: 'status', ids, status: 'resolved' }),
        });
      } else if (action === 'delete') {
        res = await fetchWithTenant(withChannel(`${CONV_API}/bulk`), {
          method: 'POST',
          body: JSON.stringify({ action: 'delete', ids }),
        });
      }
      if (res?.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const typedConversations = useMemo(() => conversations as Conversation[], [conversations]);
  const typedSelectedConversation = useMemo(
    () => selectedConversation as Conversation | null,
    [selectedConversation]
  );

  const allUnreadCounts = useMemo(() => {
    const sdkCounts = unreadCounts as Record<string, number>;
    return {
      all: sdkCounts.all ?? 0,
      whatsapp: sdkCounts.whatsapp ?? 0,
      linkedin: sdkCounts.linkedin ?? 0,
      gmail: sdkCounts.gmail ?? 0,
      outlook: sdkCounts.outlook ?? 0,
      instagram: sdkCounts.instagram ?? 0,
    };
  }, [unreadCounts]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar — desktop */}
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
              conversations={typedConversations}
              selectedId={selectedId}
              onSelectConversation={handleSelectConversation}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              contextStatusFilter={contextStatusFilter}
              onContextStatusFilterChange={setContextStatusFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              unreadCounts={allUnreadCounts}
              onBulkAction={handleBulkAction}
              onGroupSelect={handleSelectGroup}
              onOpenGroupInfo={handleOpenGroupInfo}
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
                conversations={typedConversations}
                selectedId={selectedId}
                onSelectConversation={(id) => {
                  handleSelectConversation(id);
                  setIsSidebarCollapsed(true);
                }}
                channelFilter={channelFilter}
                onChannelFilterChange={setChannelFilter}
                contextStatusFilter={contextStatusFilter}
                onContextStatusFilterChange={setContextStatusFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                unreadCounts={allUnreadCounts}
                onBulkAction={handleBulkAction}
                onGroupSelect={handleSelectGroup}
                onOpenGroupInfo={handleOpenGroupInfo}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed sidebar toggle (desktop) */}
      {isSidebarCollapsed && (
        <div className="hidden lg:flex flex-col items-center py-3 px-2 bg-card border-r border-border">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSidebar}>
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main chat area */}
      {activeGroup && !groupMemberSelected ? (
        <GroupChatWindow
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          groupColor={activeGroup.color}
          onBack={handleBackFromGroup}
          autoOpenInfo={groupInfoAutoOpen}
        />
      ) : (
        <ChatWindow
          conversation={typedSelectedConversation}
          onMarkResolved={markAsResolved}
          onMute={muteConversation}
          onSendMessage={sendMessage}
          onTogglePanel={toggleContextPanel}
          isPanelOpen={isContextPanelOpen}
          onPin={handlePin}
          onLock={handleLock}
          onFavorite={handleFavorite}
          onExport={handleExport}
          onBlock={handleBlock}
          onDelete={handleDelete}
        />
      )}

      {/* Context panel */}
      <AnimatePresence mode="wait">
        {isContextPanelOpen && typedSelectedConversation && (!activeGroup || groupMemberSelected) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full flex-shrink-0 overflow-hidden hidden md:block"
          >
            <ConversationContextPanel
              conversation={typedSelectedConversation}
              onClose={toggleContextPanel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────
type WaTab = 'personal' | 'waba';

const WA_TABS: { id: WaTab; label: string; sublabel: string }[] = [
  { id: 'personal', label: 'Personal WA', sublabel: 'personal_whatsapp' },
  { id: 'waba',    label: 'WA Business',  sublabel: 'business_whatsapp' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page shell — handles only tab + AI playground state
// ─────────────────────────────────────────────────────────────────────────────
export function ConversationsPage() {
  const [activeTab, setActiveTab] = useState<WaTab>('personal');
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar: WA channel tabs + AI playground toggle */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border bg-card shrink-0">
        {/* Channel tabs */}
        <div className="flex items-center gap-1">
          {WA_TABS.map(({ id, label, sublabel }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-all',
                activeTab === id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <ChannelIcon channel={sublabel as any} size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* AI Playground toggle */}
        <Button
          variant={isPlaygroundOpen ? 'secondary' : 'ghost'}
          size="sm"
          className={`gap-1.5 text-xs h-7 ${isPlaygroundOpen ? 'text-primary' : ''}`}
          onClick={() => setIsPlaygroundOpen((v) => !v)}
          title="Open AI Playground to test your system prompt"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Test AI
        </Button>
      </div>

      {/* Channel views — only the active tab is mounted */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'personal' && <ChannelConversationView channel="personal" />}
        {activeTab === 'waba'     && <ChannelConversationView channel="waba" />}
      </div>

      {/* AI Playground slide-over */}
      <AnimatePresence>
        {isPlaygroundOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 sm:hidden"
              onClick={() => setIsPlaygroundOpen(false)}
            />
            <AIPlayground onClose={() => setIsPlaygroundOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
