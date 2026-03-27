import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
  Search,
  MessageSquare,
  CheckSquare,
  MinusSquare,
  Square,
  X,
  Trash2,
  CheckCircle2,
  Loader2,
  Filter,
  Send,
  Users,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Conversation, Channel } from '@/types/conversation';
import { ConversationListItem } from './ConversationListItem';
import { ChannelIcon } from './ChannelIcon';
import { TemplatePicker } from './TemplatePicker';
import { ChatGroupManager, AddToGroupDropdown, type ChatGroup } from './ChatGroupManager';
import { ImportLeadsDialog } from './ImportLeadsDialog';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ContextStatusOption {
  value: string;
  label: string;
  count: number;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  channelFilter: Channel | 'all';
  onChannelFilterChange: (channel: Channel | 'all') => void;
  contextStatusFilter: string;
  onContextStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unreadCounts: Record<string, number>;
  onBulkAction?: (action: string, ids: string[]) => void;
  onRefresh?: () => void;
  onGroupSelect?: (group: ChatGroup) => void;
  onOpenGroupInfo?: (group: ChatGroup) => void;
}

const channelButtons: { id: Channel | 'all'; label: string; channel?: Channel }[] = [
  { id: 'all', label: 'All' },
  { id: 'whatsapp', label: 'WhatsApp', channel: 'whatsapp' },
  { id: 'linkedin', label: 'LinkedIn', channel: 'linkedin' },
  { id: 'gmail', label: 'Gmail', channel: 'gmail' },
  { id: 'outlook', label: 'Outlook', channel: 'outlook' },
  { id: 'instagram', label: 'Instagram', channel: 'instagram' },
];

const channelColorMap: Record<string, string> = {
  whatsapp: 'hover:bg-green-50/50 border-green-200 text-green-600',
  linkedin: 'hover:bg-blue-50/50 border-blue-200 text-blue-600',
  gmail: 'hover:bg-orange-50/50 border-orange-200 text-orange-400',
  outlook: 'hover:bg-blue-50/50 border-blue-200 text-blue-700',
  instagram: 'hover:bg-pink-50/50 border-pink-200 text-pink-600',
  all: 'border-slate-200 text-slate-600 hover:bg-slate-50',
};

/** Convert snake_case context_status to a readable label */
function formatContextStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Color palette for context status chips — active & inactive variants */
const STATUS_CHIP_COLORS: Record<string, { active: string; inactive: string }> = {
  onboarding_greeting:          { active: 'bg-blue-600 text-white',    inactive: 'bg-blue-50 text-blue-700 border border-blue-200' },
  onboarding_profile:           { active: 'bg-blue-600 text-white',    inactive: 'bg-blue-50 text-blue-700 border border-blue-200' },
  onboarding_complete:          { active: 'bg-emerald-600 text-white', inactive: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  icp_discovery:                { active: 'bg-violet-600 text-white',  inactive: 'bg-violet-50 text-violet-700 border border-violet-200' },
  match_suggested:              { active: 'bg-amber-600 text-white',   inactive: 'bg-amber-50 text-amber-700 border border-amber-200' },
  coordination_a_availability:  { active: 'bg-orange-600 text-white',  inactive: 'bg-orange-50 text-orange-700 border border-orange-200' },
  coordination_b_availability:  { active: 'bg-orange-600 text-white',  inactive: 'bg-orange-50 text-orange-700 border border-orange-200' },
  coordination_overlap_proposed:{ active: 'bg-rose-600 text-white',    inactive: 'bg-rose-50 text-rose-700 border border-rose-200' },
  post_meeting_followup:        { active: 'bg-pink-600 text-white',    inactive: 'bg-pink-50 text-pink-700 border border-pink-200' },
  kpi_query:                    { active: 'bg-cyan-600 text-white',    inactive: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  idle:                         { active: 'bg-slate-600 text-white',   inactive: 'bg-slate-100 text-slate-600 border border-slate-200' },
  general_qa:                   { active: 'bg-teal-600 text-white',    inactive: 'bg-teal-50 text-teal-700 border border-teal-200' },
};

const DEFAULT_CHIP_COLOR = { active: 'bg-gray-600 text-white', inactive: 'bg-gray-50 text-gray-600 border border-gray-200' };

function getChipColor(value: string, isActive: boolean) {
  const colors = STATUS_CHIP_COLORS[value] || DEFAULT_CHIP_COLOR;
  return isActive ? colors.active : colors.inactive;
}

// fetchWithTenant imported from @/lib/fetch-with-tenant

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  selectedId,
  onSelectConversation,
  channelFilter,
  onChannelFilterChange,
  contextStatusFilter,
  onContextStatusFilterChange,
  searchQuery,
  onSearchChange,
  unreadCounts,
  onBulkAction,
  onRefresh,
  onGroupSelect,
  onOpenGroupInfo,
}: ConversationSidebarProps) {
  const [contextStatuses, setContextStatuses] = useState<ContextStatusOption[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templateSending, setTemplateSending] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Chat Groups state
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [groupConversationIds, setGroupConversationIds] = useState<Set<string>>(new Set());
  const [groupTemplateSendTarget, setGroupTemplateSendTarget] = useState<{ groupId: string; count: number } | null>(null);

  // Named-only filter: hide contacts with unknown/unresolved names
  const [namedOnly, setNamedOnly] = useState(false);

  // Fetch tenant-specific context statuses on mount
  useEffect(() => {
    setStatusesLoading(true);
    fetchWithTenant('/api/whatsapp-conversations/conversations/context-statuses')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setContextStatuses(
            data.data.map((s: { value: string; count: number }) => ({
              value: s.value,
              label: formatContextStatus(s.value),
              count: s.count,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setStatusesLoading(false));
  }, []);

  // Fetch group conversation IDs when a group is selected
  useEffect(() => {
    if (!activeGroup) {
      setGroupConversationIds(new Set());
      return;
    }
    fetchWithTenant(`/api/whatsapp-conversations/chat-groups/${activeGroup.id}/conversations`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setGroupConversationIds(new Set(data.data));
        }
      })
      .catch(() => {});
  }, [activeGroup]);

  // Filter conversations: named-only + group filter (context status is server-side)
  const filteredConversations = useMemo(() => {
    let list = conversations;

    // Hide conversations where the contact has no saved name ("Unknown")
    if (namedOnly) {
      list = list.filter((c) => c.contact.name && c.contact.name !== 'Unknown');
    }

    if (activeGroup && groupConversationIds.size > 0) {
      list = list.filter((conv) => groupConversationIds.has(conv.id));
    }

    return list;
  }, [conversations, activeGroup, groupConversationIds, namedOnly]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
  }, [filteredConversations]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback(
    (action: string) => {
      if (onBulkAction && selectedIds.size > 0) {
        onBulkAction(action, Array.from(selectedIds));
      }
      exitSelectMode();
    },
    [onBulkAction, selectedIds, exitSelectMode]
  );

  // Remove selected conversations from the active group
  const [removingFromGroup, setRemovingFromGroup] = useState(false);
  const handleRemoveFromGroup = useCallback(async () => {
    if (!activeGroup || selectedIds.size === 0) return;
    setRemovingFromGroup(true);
    try {
      const promises = Array.from(selectedIds).map((convId) =>
        fetchWithTenant(`/api/whatsapp-conversations/chat-groups/${activeGroup.id}/conversations/${convId}`, {
          method: 'DELETE',
        })
      );
      await Promise.all(promises);
      // Remove from local state immediately
      setGroupConversationIds((prev) => {
        const next = new Set(prev);
        selectedIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      console.error('Error removing from group:', err);
    } finally {
      setRemovingFromGroup(false);
      exitSelectMode();
    }
  }, [activeGroup, selectedIds, exitSelectMode]);

  const handleContextStatusClick = useCallback((status: string) => {
    onContextStatusFilterChange(status);
  }, [onContextStatusFilterChange]);

  const clearFilter = useCallback(() => {
    onContextStatusFilterChange('all');
  }, [onContextStatusFilterChange]);

  const clearGroupFilter = useCallback(() => {
    setActiveGroup(null);
  }, []);

  // Template send for bulk selected conversations
  const handleTemplateSend = useCallback(
    async (templateName: string, languageCode: string, parameters: string[]) => {
      setTemplateSending(true);
      try {
        // If sending to a group (via group manager), use the group endpoint
        if (groupTemplateSendTarget) {
          const res = await fetchWithTenant(
            `/api/whatsapp-conversations/chat-groups/${groupTemplateSendTarget.groupId}/send-template`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template_name: templateName,
                language_code: languageCode,
                parameters,
              }),
            }
          );
          const data = await res.json();
          if (!data.success) console.error('Group template send failed:', data.error);
        } else if (selectedIds.size > 0) {
          // Bulk send to selected conversations
          const res = await fetchWithTenant('/api/whatsapp-conversations/conversations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send-template',
              conversation_ids: Array.from(selectedIds),
              template_name: templateName,
              language_code: languageCode,
              parameters,
            }),
          });
          const data = await res.json();
          if (!data.success) console.error('Bulk template send failed:', data.error);
        }
      } catch (err) {
        console.error('Template send error:', err);
      } finally {
        setTemplateSending(false);
        setIsTemplatePickerOpen(false);
        setGroupTemplateSendTarget(null);
        exitSelectMode();
      }
    },
    [selectedIds, groupTemplateSendTarget, exitSelectMode]
  );

  // Called from ChatGroupManager "Send Template" button
  const handleGroupTemplateSend = useCallback((groupId: string, conversationCount: number) => {
    setGroupTemplateSendTarget({ groupId, count: conversationCount });
    setIsTemplatePickerOpen(true);
  }, []);

  // Called from ChatGroupManager when user clicks a group to view
  const handleSelectGroup = useCallback((group: ChatGroup) => {
    setActiveGroup(group);
    onGroupSelect?.(group);
  }, [onGroupSelect]);

  const renderItem = useCallback(
    (index: number) => {
      const conversation = filteredConversations[index];
      return (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedId === conversation.id}
          onSelect={isSelectMode ? () => toggleSelect(conversation.id) : onSelectConversation}
          isSelectMode={isSelectMode}
          isChecked={selectedIds.has(conversation.id)}
          onContextStatusClick={handleContextStatusClick}
        />
      );
    },
    [filteredConversations, selectedId, onSelectConversation, isSelectMode, selectedIds, toggleSelect, handleContextStatusClick]
  );

  const itemContent = useCallback(
    (index: number) => renderItem(index),
    [renderItem]
  );

  // Template picker count: group count or selected count
  const templatePickerCount = groupTemplateSendTarget
    ? groupTemplateSendTarget.count
    : selectedIds.size;

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Search + Groups + Select toggle */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 bg-secondary/50"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => setIsImportDialogOpen(true)}
            title="Import Leads"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => setIsGroupManagerOpen(true)}
            title="Chat Groups"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant={isSelectMode ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => (isSelectMode ? exitSelectMode() : setIsSelectMode(true))}
            title={isSelectMode ? 'Exit select mode' : 'Select multiple'}
          >
            {isSelectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Channel Filters */}
      <div className="p-2 flex gap-1 border-b border-border overflow-x-auto">
        <TooltipProvider>
          {channelButtons.map(({ id, label, channel }) => {
            const isActive = channelFilter === id;
            const count = unreadCounts[id] ?? 0;

            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChannelFilterChange(id as Channel | 'all')}
                    className={cn(
                      'flex-shrink-0 h-8 w-8 p-0 flex items-center justify-center gap-1.5 text-xs font-medium transition-all relative',
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 ring-2 ring-slate-900/10'
                        : channelColorMap[id]
                    )}
                  >
                    {channel ? (
                      <ChannelIcon channel={channel} size={14} />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    {count > 0 && (
                      <span
                        className={cn(
                          'absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-card shadow-sm',
                          isActive ? 'bg-white text-slate-900' : 'bg-primary text-primary-foreground'
                        )}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Named-only toggle: hide Unknown / unsaved contacts */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={namedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNamedOnly((v) => !v)}
                className={cn(
                  'flex-shrink-0 h-8 w-8 p-0 flex items-center justify-center text-xs font-medium transition-all',
                  namedOnly
                    ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 ring-2 ring-slate-900/10'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
              {namedOnly ? 'Showing named only' : 'Hide unknown contacts'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Context Status Filters (tenant-specific) */}
      {contextStatuses.length > 0 && (
        <div className="p-2 flex gap-1.5 border-b border-border overflow-x-auto">
          {contextStatuses.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => onContextStatusFilterChange(value)}
              className={cn(
                'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                getChipColor(value, contextStatusFilter === value),
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'ml-1 text-[10px]',
                  contextStatusFilter === value ? 'opacity-80' : 'opacity-60'
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Active context status filter bar */}
      {contextStatusFilter !== 'all' && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Filtered by:</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              getChipColor(contextStatusFilter, true),
            )}>
              {formatContextStatus(contextStatusFilter)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearFilter}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Active group filter bar */}
      {activeGroup && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Group:</span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: activeGroup.color }}
              />
              <span className="font-medium">{activeGroup.name}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearGroupFilter}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Bulk action bar */}
      {isSelectMode && (
        <TooltipProvider>
          <div className="p-2 border-b border-border bg-primary/5 flex items-center gap-2">
          <button
            onClick={() =>
              selectedIds.size === filteredConversations.length ? deselectAll() : selectAll()
            }
            className="flex items-center gap-1.5 px-1"
            title={selectedIds.size === filteredConversations.length ? 'Deselect all' : 'Select all'}
          >
            {selectedIds.size === filteredConversations.length && selectedIds.size > 0 ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : selectedIds.size > 0 ? (
              <MinusSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <span className="text-xs text-muted-foreground flex-1">
            {selectedIds.size} selected
          </span>
          <AddToGroupDropdown selectedIds={selectedIds} onDone={exitSelectMode} />
          {activeGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-orange-600"
              onClick={handleRemoveFromGroup}
              disabled={removingFromGroup || selectedIds.size === 0}
            >
              {removingFromGroup ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <UserMinus className="h-3.5 w-3.5 mr-1" />
              )}
              Remove from Group
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 flex items-center justify-center text-blue-600 hover:bg-blue-50"
                onClick={() => setIsTemplatePickerOpen(true)}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
              Send Template
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 flex items-center justify-center text-green-600 hover:bg-green-50"
                onClick={() => handleBulkAction('resolve')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
              Resolve
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 flex items-center justify-center text-destructive hover:bg-red-50"
                onClick={() => handleBulkAction('delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
              Delete
            </TooltipContent>
          </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* Conversation List - Virtualized */}
      <div className="flex-1 overflow-hidden">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No conversations found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <Virtuoso
            style={{ height: '100%' }}
            totalCount={filteredConversations.length}
            itemContent={itemContent}
            className="custom-scrollbar"
          />
        )}
      </div>

      {/* Chat Group Manager Dialog */}
      <ChatGroupManager
        open={isGroupManagerOpen}
        onOpenChange={setIsGroupManagerOpen}
        onSelectGroup={handleSelectGroup}
        onSendTemplateToGroup={handleGroupTemplateSend}
        onOpenGroupInfo={onOpenGroupInfo}
      />

      {/* Template Picker Dialog */}
      <TemplatePicker
        open={isTemplatePickerOpen}
        onOpenChange={(open) => {
          setIsTemplatePickerOpen(open);
          if (!open) setGroupTemplateSendTarget(null);
        }}
        selectedCount={templatePickerCount}
        onSend={handleTemplateSend}
        sending={templateSending}
      />

      {/* Import Leads Dialog */}
      <ImportLeadsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          if (onRefresh) onRefresh();
          else window.location.reload();
        }}
      />
    </div>
  );
});
