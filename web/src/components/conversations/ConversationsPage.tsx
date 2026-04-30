"use client";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useConversations } from '@lad/frontend-features/conversations';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatWindow } from './ChatWindow';
import { GroupChatWindow } from './GroupChatWindow';
import { ConversationContextPanel } from './ConversationContextPanel';
import { AIPlayground } from './AIPlayground';
import { LinkedInConversationView } from './LinkedInConversationView';
import { EmailChannelView } from './EmailChannelView';
import { CreateBroadcastGroupModal } from './CreateBroadcastGroupModal';
import type { ChatGroup } from './ChatGroupManager';
import type { Conversation, Channel } from '@/types/conversation';
import { Button } from '@/components/ui/button';
import { PanelLeft, FlaskConical, X } from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { ChannelIcon } from './ChannelIcon';
import { cn } from '@/lib/utils';

const CONV_API = '/api/whatsapp-conversations/conversations';

// ─────────────────────────────────────────────────────────────────────────────
// Inner view — one instance per tab, fully independent hook + state
// ─────────────────────────────────────────────────────────────────────────────
function ChannelConversationView({ 
  channel, 
  onShowBroadcastModal,
  visibleTabs,
  activeTab,
  setActiveTab,
  isPlaygroundOpen,
  setIsPlaygroundOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isMobile
}: { 
  channel: 'personal' | 'waba'; 
  onShowBroadcastModal?: () => void;
  visibleTabs: { id: WaTab; label: string; sublabel: string }[];
  activeTab: WaTab;
  setActiveTab: (tab: WaTab) => void;
  isPlaygroundOpen: boolean;
  setIsPlaygroundOpen: (val: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  isMobile: boolean;
}) {
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
    loadMore,
    isLoadingMore,
    hasMore,
  } = useConversations({ channel });


  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [contextPanelTab, setContextPanelTab] = useState<'assignment' | 'notes' | 'comments'>('assignment');
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [groupMemberSelected, setGroupMemberSelected] = useState(false);
  const [groupInfoAutoOpen, setGroupInfoAutoOpen] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [createGroupSelectedIds, setCreateGroupSelectedIds] = useState<string[]>([]);

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

  const handleGroupDeleted = useCallback(() => {
    setActiveGroup(null);
    setGroupMemberSelected(false);
    setGroupInfoAutoOpen(false);
    setGroupRefreshKey(k => k + 1); // force sidebar to reload groups list
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
              backendChannel={channel}
              onBulkAction={handleBulkAction}
              onRefresh={invalidate}
              onGroupSelect={handleSelectGroup}
              onOpenGroupInfo={handleOpenGroupInfo}
              onShowBroadcastModal={onShowBroadcastModal}
              onShowCreateGroupModal={(ids) => {
                setCreateGroupSelectedIds(ids);
                setShowCreateGroupModal(true);
              }}
              groupRefreshKey={groupRefreshKey}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
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
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={toggleSidebar}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full h-full bg-card flex flex-col pt-14"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Sidebar Header with Tabs + Test AI */}
              <div className="p-3 border-b border-border bg-card flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
                  {visibleTabs.map(({ id, label, sublabel }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap',
                        activeTab === id
                          ? 'text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
                      )}
                      style={activeTab === id ? { backgroundColor: getTabColor(id) } : undefined}
                    >
                      <ChannelIcon
                        channel={sublabel as any}
                        size={14}
                        overrideColor={activeTab === id ? '#ffffff' : undefined}
                      />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Mobile Test AI button */}
                <Button
                  variant={isPlaygroundOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    "flex-shrink-0 h-8 px-3 rounded-full text-[11px] font-semibold gap-1.5",
                    isPlaygroundOpen && "text-primary bg-primary/10"
                  )}
                  onClick={() => {
                    setIsPlaygroundOpen(!isPlaygroundOpen);
                    setIsSidebarCollapsed(true);
                  }}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  Test AI
                </Button>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'linkedin' ? (
                  <LinkedInConversationView 
                    visibleTabs={visibleTabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onBack={() => setIsSidebarCollapsed(false)}
                    isMobile={isMobile}
                  />
                ) : (
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
                    backendChannel={channel}
                    onBulkAction={handleBulkAction}
                    onRefresh={invalidate}
                    onGroupSelect={handleSelectGroup}
                    onOpenGroupInfo={handleOpenGroupInfo}
                    onShowBroadcastModal={onShowBroadcastModal}
                    onShowCreateGroupModal={(ids) => {
                      setCreateGroupSelectedIds(ids);
                      setShowCreateGroupModal(true);
                    }}
                    groupRefreshKey={groupRefreshKey}
                    onLoadMore={loadMore}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
                  />
                )}
              </div>
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
          onGroupDeleted={handleGroupDeleted}
          autoOpenInfo={groupInfoAutoOpen}
          channel={channel}
        />
      ) : (
        <ChatWindow
          conversation={typedSelectedConversation}
          onMarkResolved={markAsResolved}
          onMute={muteConversation}
          onSendMessage={sendMessage}
          onTogglePanel={toggleContextPanel}
          isPanelOpen={isContextPanelOpen}
          backendChannel={channel}
          onPin={handlePin}
          onLock={handleLock}
          onFavorite={handleFavorite}
          onExport={handleExport}
          onBlock={handleBlock}
          onDelete={handleDelete}
          onBack={() => {
            selectConversation('');
            setIsSidebarCollapsed(false);
          }}
          onOpenAssignmentPanel={() => {
            setContextPanelTab('assignment');
            if (!isContextPanelOpen) setIsContextPanelOpen(true);
          }}
        />
      )}

      {/* Context panel */}
      <AnimatePresence mode="wait">
        {isContextPanelOpen && typedSelectedConversation && (!activeGroup || groupMemberSelected) && (
          <motion.div
            initial={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
            animate={isMobile ? { x: 0 } : { width: 320, opacity: 1 }}
            exit={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
              "h-full flex-shrink-0 overflow-hidden",
              "fixed inset-0 z-50 w-full lg:relative lg:inset-auto lg:z-0 lg:w-[320px] bg-background",
              "pt-14 lg:pt-0"
            )}
          >
            <ConversationContextPanel
              conversation={typedSelectedConversation}
              onClose={toggleContextPanel}
              backendChannel={channel}
              defaultTab={contextPanelTab}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Broadcast Group Modal */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <CreateBroadcastGroupModal
            open={showCreateGroupModal}
            onOpenChange={setShowCreateGroupModal}
            selectedIds={createGroupSelectedIds}
            onSuccess={() => {
              setGroupRefreshKey((prev) => prev + 1);
              setCreateGroupSelectedIds([]);
            }}
            channel={channel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────
type WaTab = 'personal' | 'waba' | 'linkedin' | 'gmail' | 'outlook';


// ─────────────────────────────────────────────────────────────────────────────
// Utility: Check which channels are connected — uses the same endpoints as
// the Integrations settings page for consistency.
// All checks run in parallel so the tab bar appears in one paint.
// ─────────────────────────────────────────────────────────────────────────────
interface ChannelConnectionStatus {
  personal: boolean;
  waba: boolean;
  linkedin: boolean;
  gmail: boolean;
  gmailEmail: string | null;
  outlook: boolean;
  outlookEmail: string | null;
}

async function getConnectedChannels(): Promise<ChannelConnectionStatus> {
  const [personalResult, wabaResult, linkedinResult, emailResult] = await Promise.allSettled([
    // Personal WA
    fetchWithTenant('/api/personal-whatsapp/accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data ?? [];
        return accounts.some((a: any) => a.status === 'connected');
      })
      .catch(() => false),

    // WA Business
    fetchWithTenant('/api/whatsapp-conversations/admin/whatsapp-accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data ?? [];
        return accounts.some((a: any) => a.status === 'active' || a.status === 'connected');
      })
      .catch(() => false),

    // LinkedIn
    fetchWithTenant('/api/campaigns/linkedin/accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data?.data ?? data ?? [];
        return accounts.some((a: any) =>
          a.status === 'connected' || a.status === 'active' || a.is_connected === true
        );
      })
      .catch(() => false),

    // Gmail + Outlook (single status endpoint)
    fetchWithTenant('/api/email-conversations/status')
      .then(async (res) => {
        if (!res.ok) return { gmail: false, gmailEmail: null, outlook: false, outlookEmail: null };
        const data = await res.json();
        return {
          gmail:       !!data?.gmail?.connected,
          gmailEmail:  data?.gmail?.email || null,
          outlook:     !!data?.outlook?.connected,
          outlookEmail: data?.outlook?.email || null,
        };
      })
      .catch(() => ({ gmail: false, gmailEmail: null, outlook: false, outlookEmail: null })),
  ]);

  const emailStatus = emailResult.status === 'fulfilled'
    ? emailResult.value as { gmail: boolean; gmailEmail: string | null; outlook: boolean; outlookEmail: string | null }
    : { gmail: false, gmailEmail: null, outlook: false, outlookEmail: null };

  return {
    personal:     personalResult.status === 'fulfilled' ? (personalResult.value as boolean) : false,
    waba:         wabaResult.status    === 'fulfilled' ? (wabaResult.value as boolean)    : false,
    linkedin:     linkedinResult.status === 'fulfilled' ? (linkedinResult.value as boolean) : false,
    gmail:        emailStatus.gmail,
    gmailEmail:   emailStatus.gmailEmail,
    outlook:      emailStatus.outlook,
    outlookEmail: emailStatus.outlookEmail,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Determine default tab — prefer Personal WA, then WABA, then LinkedIn,
// then Gmail, then Outlook
// ─────────────────────────────────────────────────────────────────────────────
function getDefaultTab(status: ChannelConnectionStatus): WaTab {
  if (status.personal) return 'personal';
  if (status.waba)     return 'waba';
  if (status.linkedin) return 'linkedin';
  if (status.gmail)    return 'gmail';
  if (status.outlook)  return 'outlook';
  return 'personal'; // fallback (nothing connected)
}

// All possible tabs in display order
const ALL_TABS: { id: WaTab; label: string; sublabel: string }[] = [
  { id: 'personal', label: 'Personal WA', sublabel: 'personal_whatsapp' },
  { id: 'waba',     label: 'WA Business',  sublabel: 'business_whatsapp' },
  { id: 'linkedin', label: 'LinkedIn',      sublabel: 'linkedin' },
  { id: 'gmail',    label: 'Gmail',         sublabel: 'gmail' },
  { id: 'outlook',  label: 'Outlook',       sublabel: 'outlook' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Get brand color for tab
// ─────────────────────────────────────────────────────────────────────────────
function getTabColor(tabId: WaTab): string {
  switch (tabId) {
    case 'personal':  return '#25D366'; // WhatsApp green
    case 'waba':      return '#128C7E'; // WhatsApp Business teal
    case 'linkedin':  return '#0077B5'; // LinkedIn blue
    case 'gmail':     return '#EA4335'; // Gmail red
    case 'outlook':   return '#0078D4'; // Outlook blue
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell — handles only tab + AI playground state
// ─────────────────────────────────────────────────────────────────────────────
export function ConversationsPage() {
  const [activeTab, setActiveTab] = useState<WaTab>('personal');
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // null = still loading; once resolved, only connected channels are shown
  const [channelStatus, setChannelStatus] = useState<ChannelConnectionStatus | null>(null);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check which channels are connected on mount — all parallel requests
  useEffect(() => {
    getConnectedChannels().then((status) => {
      setChannelStatus(status);
      setActiveTab(getDefaultTab(status));
    });
  }, []);

  // Show only tabs whose channel is actively connected.
  // While loading (null) render nothing so there's no flash of wrong tabs.
  const visibleTabs = channelStatus
    ? ALL_TABS.filter((t) => {
        // Gmail and Outlook use separate boolean fields
        if (t.id === 'gmail')   return channelStatus.gmail;
        if (t.id === 'outlook') return channelStatus.outlook;
        return channelStatus[t.id as keyof ChannelConnectionStatus] === true;
      })
    : [];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar: WA channel tabs + AI toggle — now always visible */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border bg-card shrink-0">
        {/* Channel tabs — only connected channels are rendered */}
        <div className="flex items-center gap-1">
          {/* Loading skeleton while connection status is being resolved */}
          {channelStatus === null && (
            <>
              <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
            </>
          )}
          {visibleTabs.map(({ id, label, sublabel }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-all',
                activeTab === id
                  ? 'text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              style={activeTab === id ? { backgroundColor: getTabColor(id) } : undefined}
            >
              <ChannelIcon
                channel={sublabel as any}
                size={16}
                overrideColor={activeTab === id ? '#ffffff' : undefined}
              />
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
        {activeTab === 'personal' && (
          <ChannelConversationView
            channel="personal"
            onShowBroadcastModal={() => setShowBroadcastModal(true)}
            visibleTabs={visibleTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isPlaygroundOpen={isPlaygroundOpen}
            setIsPlaygroundOpen={setIsPlaygroundOpen}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isMobile={isMobile}
          />
        )}
        {activeTab === 'waba' && (
          <ChannelConversationView
            channel="waba"
            onShowBroadcastModal={() => setShowBroadcastModal(true)}
            visibleTabs={visibleTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isPlaygroundOpen={isPlaygroundOpen}
            setIsPlaygroundOpen={setIsPlaygroundOpen}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isMobile={isMobile}
          />
        )}
        {activeTab === 'linkedin'  && <LinkedInConversationView />}
        {activeTab === 'gmail'     && <EmailChannelView provider="gmail"   connectedEmail={channelStatus?.gmailEmail   ?? undefined} />}
        {activeTab === 'outlook'   && <EmailChannelView provider="outlook" connectedEmail={channelStatus?.outlookEmail ?? undefined} />}
      </div>

      {/* Broadcast Modal (WhatsApp-only) */}
      <AnimatePresence>
        {showBroadcastModal && (activeTab === 'personal' || activeTab === 'waba') && (
          <BroadcastModal onClose={() => setShowBroadcastModal(false)} activeTab={activeTab as 'personal' | 'waba'} />
        )}
      </AnimatePresence>

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

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Modal Component
// ─────────────────────────────────────────────────────────────────────────────
interface BroadcastModalProps {
  onClose: () => void;
  onSent?: () => void;
  activeTab: 'personal' | 'waba';
}

function BroadcastModal({ onClose, onSent, activeTab }: BroadcastModalProps) {
  const queryClient = useQueryClient();
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({}); // group ID → conversation IDs
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Load groups and contacts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load chat groups
        const groupsRes = await fetchWithTenant(
          `/api/whatsapp-conversations/chat-groups?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
        );
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groupsList = groupsData.data || groupsData || [];
          setGroups(groupsList);

          // Load members for each group
          const membersMap: Record<string, string[]> = {};
          for (const group of groupsList) {
            try {
              const membersRes = await fetchWithTenant(
                `/api/whatsapp-conversations/chat-groups/${group.id}?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
              );
              if (membersRes.ok) {
                const memberData = await membersRes.json();
                const conversationIds = (memberData.data?.conversations || memberData.conversations || [])
                  .map((c: any) => c.id || c.conversation_id)
                  .filter((id: any) => id);
                membersMap[group.id] = conversationIds;
              }
            } catch (err) {
              console.error(`Failed to load members for group ${group.id}:`, err);
              membersMap[group.id] = [];
            }
          }
          setGroupMembers(membersMap);
        }

        // Load contacts (from conversations)
        const contactsRes = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
        );
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData.data || contactsData || []);
        }

        // Load templates
        const templatesRes = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/templates?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
        );
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.data || templatesData || []);
        }
      } catch (err) {
        console.error('Error loading broadcast data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  const handleSendBroadcast = async () => {
    if (selectedRecipients.length === 0 || !selectedTemplate) {
      alert('Please select at least one recipient and a template');
      return;
    }

    try {
      setIsSending(true);

      // Send broadcast to selected recipients
      // Fetch template content for personalization
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) {
        alert('Template not found');
        return;
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const recipientId of selectedRecipients) {
        try {
          // Fetch conversation/contact data for personalization
          const convRes = await fetchWithTenant(
            `/api/whatsapp-conversations/conversations/${recipientId}?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
          );
          const convData = convRes.ok ? await convRes.json() : {};
          const contact = convData.data?.contact || convData.contact || {};

          // Helper: derive first name from contact data
          const derivedFirstName = contact.name?.trim().split(/\s+/)[0] ||
                                  contact.contact_name?.trim().split(/\s+/)[0] ||
                                  '';

          // Personalize template content
          let personalizedContent = template.content || '';
          personalizedContent = personalizedContent
            .replace(/\{\{name\}\}/gi, derivedFirstName)
            .replace(/\{\{first_name\}\}/gi, derivedFirstName)
            .replace(/\{\{contact_name\}\}/gi, contact.contact_name || '')
            .replace(/\{\{email\}\}/gi, contact.email || '')
            .replace(/\{\{phone\}\}/gi, contact.phone || '');

          // Send personalized message
          const sendRes = await fetchWithTenant(
            `/api/whatsapp-conversations/conversations/${recipientId}/send-template`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: personalizedContent,
                channel: activeTab === 'waba' ? 'waba' : 'personal',
              }),
            }
          );

          if (sendRes.ok) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`Failed to send to ${recipientId}:`, err);
          failedCount++;
        }
      }

      alert(`Broadcast sent! Sent: ${sentCount}, Failed: ${failedCount}`);
      // Refresh conversation list so newly created conversations (e.g. for new contacts) appear
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
      onSent?.();
      onClose();
    } catch (err) {
      console.error('Error sending broadcast:', err);
      alert('Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-1/2 z-50 transform -translate-y-1/2 max-w-5xl w-full sm:w-[90vw] h-[90vh] mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Send Broadcast</h2>
            <button
              onClick={onClose}
              title="Close"
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground opacity-70 transition-all hover:opacity-100 hover:bg-gray-100 focus:outline-hidden z-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Template Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipients Selection */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <label className="text-sm font-medium">Select Recipients</label>

                {/* Groups */}
                {groups.length > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Groups</h3>
                    {groups.map((group: any) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.some((id) => groupMembers[group.id]?.includes(id))}
                          onChange={(e) => {
                            const conversationIds = groupMembers[group.id] || [];
                            if (e.target.checked) {
                              // Add all members of this group
                              setSelectedRecipients([...new Set([...selectedRecipients, ...conversationIds])]);
                            } else {
                              // Remove all members of this group
                              setSelectedRecipients(
                                selectedRecipients.filter((id) => !conversationIds.includes(id))
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{group.name || `Group ${group.id.substring(0, 8)}`}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Contacts */}
                {contacts.length > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Contacts</h3>
                    {contacts.map((contact: any) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipients([...selectedRecipients, contact.id]);
                            } else {
                              setSelectedRecipients(selectedRecipients.filter((id) => id !== contact.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{contact.contact_name || contact.lead_name || `Contact ${contact.id.substring(0, 8)}`}</span>
                      </label>
                    ))}
                  </div>
                )}

                {groups.length === 0 && contacts.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No groups or contacts available
                  </div>
                )}
              </div>

              {/* Selected count */}
              <div className="text-sm text-muted-foreground">
                {selectedRecipients.length} recipient(s) selected
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBroadcast}
                  disabled={isSending || selectedRecipients.length === 0 || !selectedTemplate}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
