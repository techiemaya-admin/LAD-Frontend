import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Plus,
  ArrowLeft,
  Megaphone,
  FolderPlus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
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
import { getCurrentUser } from '@/lib/auth';
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
  backendChannel?: 'personal' | 'waba';
  onBulkAction?: (action: string, ids: string[]) => void;
  onRefresh?: () => void;
  onGroupSelect?: (group: ChatGroup) => void;
  onOpenGroupInfo?: (group: ChatGroup) => void;
  onShowBroadcastModal?: () => void;
}

// LinkedIn is omitted here — it now has its own top-level tab in ConversationsPage.
const channelButtons: { id: Channel | 'all'; label: string; channel?: Channel }[] = [
  { id: 'all',       label: 'All' },
  { id: 'whatsapp',  label: 'WhatsApp',  channel: 'whatsapp' },
  { id: 'gmail',     label: 'Gmail',     channel: 'gmail' },
  { id: 'outlook',   label: 'Outlook',   channel: 'outlook' },
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
  backendChannel,
  onBulkAction,
  onRefresh,
  onGroupSelect,
  onOpenGroupInfo,
  onShowBroadcastModal,
}: ConversationSidebarProps) {
  const [contextStatuses, setContextStatuses] = useState<ContextStatusOption[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templateSending, setTemplateSending] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [maskPhoneNumbers, setMaskPhoneNumbers] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u: any) => setMaskPhoneNumbers(!!(u?.maskPhoneNumber ?? u?.user?.maskPhoneNumber)))
      .catch(() => {});
  }, []);

  const displayPhone = useCallback((phone: string | undefined | null): string => {
    if (!maskPhoneNumbers || !phone) return phone || '';
    const digits = phone.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    return `+${'•'.repeat(Math.max(digits.length - 4, 4))}${last4}`;
  }, [maskPhoneNumbers]);

  const handleRefresh = useCallback(() => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);

    const channelParam = backendChannel ? `?channel=${backendChannel}` : '';

    const refreshContextStatuses = () =>
      fetchWithTenant(`/api/whatsapp-conversations/conversations/context-statuses${channelParam}`)
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
        .catch(() => {});

    // 1. Trigger a Baileys history resync on the backend (reconnects all active
    //    sessions so WhatsApp re-pushes full message history).
    fetchWithTenant(`/api/whatsapp-conversations/accounts/sync${channelParam}`, {
      method: 'POST',
    })
      .catch(() => {}) // fire-and-forget – backend handles async reconnect
      .finally(() => {
        // 2. Refresh context-status chips immediately (shows any already-DB messages).
        refreshContextStatuses();
        // 3. After ~15 s: Baileys reconnects (~5s) + WA pushes full history
        //    + syncMessagesBatch writes to DB. Then invalidate the query.
        setTimeout(() => {
          refreshContextStatuses();
          onRefresh();
          setIsRefreshing(false);
        }, 15000);
      });
  }, [onRefresh, isRefreshing, backendChannel]);

  // New Chat panel state (WhatsApp-style)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatGroups, setNewChatGroups] = useState<ChatGroup[]>([]);
  const [newChatGroupsLoading, setNewChatGroupsLoading] = useState(false);
  const [selectedNewChatIds, setSelectedNewChatIds] = useState<Set<string>>(new Set()); // contact IDs
  const [selectedNewChatGroupIds, setSelectedNewChatGroupIds] = useState<Set<string>>(new Set()); // group IDs
  const [newChatContacts, setNewChatContacts] = useState<Conversation[]>([]); // all contacts for New Chat panel
  const [newChatContactsLoading, setNewChatContactsLoading] = useState(false);
  const [newChatContactsTotal, setNewChatContactsTotal] = useState(0);
  const [groupsSectionExpanded, setGroupsSectionExpanded] = useState(true);
  const [contactsSectionExpanded, setContactsSectionExpanded] = useState(true);

  // Chat Groups state
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [groupConversationIds, setGroupConversationIds] = useState<Set<string>>(new Set());
  const [groupTemplateSendTarget, setGroupTemplateSendTarget] = useState<{ groupIds: string[]; count: number } | null>(null);

  // Load (or reload) groups + all contacts whenever the New Chat panel is open.
  // Re-runs when: panel opens, panel closes (skip), or ChatGroupManager closes after editing.
  useEffect(() => {
    if (!isNewChatOpen) return;

    // Load groups (channel-aware — personal WA reads from Node.js, WABA from Python)
    setNewChatGroupsLoading(true);
    const groupsChannel = backendChannel || 'waba';
    fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${groupsChannel}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.data)) setNewChatGroups(data.data);
      })
      .catch(() => {})
      .finally(() => setNewChatGroupsLoading(false));

    // Load contacts from wa_contacts table (personal WA) or conversations (waba)
    // Supports 6000+ contacts via paginated background loading
    setNewChatContacts([]);
    setNewChatContactsTotal(0);
    setNewChatContactsLoading(true);

    const PAGE_SIZE = 200;
    const ch = backendChannel || 'waba';

    // Helper: map raw contact/conversation record → { id, contact: { name, phone } }
    const mapContact = (raw: any): Conversation =>
      raw.contact
        ? raw // already shaped as Conversation
        : { id: raw.id, contact: { name: raw.name || raw.contact_name || '', phone: raw.phone || '' } } as unknown as Conversation;

    if (ch === 'personal') {
      // Personal WA: load from /contacts endpoint (wa_contacts table)
      // Paginated background loading with delay + retry to avoid ECONNRESET on large tables
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      const fetchPage = async (offset: number, retries = 1): Promise<{ raw: any[]; total: number } | null> => {
        try {
          const r = await fetchWithTenant(
            `/api/whatsapp-conversations/contacts?channel=personal&limit=${PAGE_SIZE}&offset=${offset}`
          );
          if (!r.ok) return null;
          const data = await r.json();
          const raw: any[] = data.contacts || data.data || [];
          const total: number = data.total || 0;
          return { raw, total };
        } catch (_) {
          if (retries > 0) {
            await sleep(500); // wait longer before retry
            return fetchPage(offset, retries - 1);
          }
          return null;
        }
      };

      const loadPage = async (offset: number, accumulated: Conversation[]) => {
        const result = await fetchPage(offset);
        if (!result) return; // give up on this page, keep what we have
        const { raw, total } = result;
        const mapped = raw.map(mapContact);
        const all = [...accumulated, ...mapped];
        setNewChatContacts(all);
        setNewChatContactsTotal(total);
        // Keep fetching until all loaded, with a small delay to avoid overwhelming the backend
        if (all.length < total && raw.length === PAGE_SIZE) {
          await sleep(150);
          await loadPage(offset + PAGE_SIZE, all);
        }
      };

      loadPage(0, []).finally(() => setNewChatContactsLoading(false));
    } else {
      // WABA: load from conversations endpoint
      fetchWithTenant(`/api/whatsapp-conversations/conversations?channel=waba&limit=500`)
        .then((r) => r.json())
        .then((data) => {
          const list: Conversation[] = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          setNewChatContacts(list);
          setNewChatContactsTotal(list.length);
        })
        .catch(() => {})
        .finally(() => setNewChatContactsLoading(false));
    }
  }, [isNewChatOpen, isGroupManagerOpen, backendChannel]); // re-fetch when group manager closes

  // Named-only filter: hide contacts with unknown/unresolved names
  const [namedOnly, setNamedOnly] = useState(false);

  // Fetch tenant-specific context statuses — scoped to the active backend channel
  useEffect(() => {
    setStatusesLoading(true);
    const channelParam = backendChannel ? `?channel=${backendChannel}` : '';
    fetchWithTenant(`/api/whatsapp-conversations/conversations/context-statuses${channelParam}`)
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
  }, [backendChannel]);

  // Fetch group conversation IDs when a group is selected
  useEffect(() => {
    if (!activeGroup) {
      setGroupConversationIds(new Set());
      return;
    }
    const chanParam = backendChannel ? `?channel=${backendChannel}` : '';
    fetchWithTenant(`/api/whatsapp-conversations/chat-groups/${activeGroup.id}/conversations${chanParam}`)
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
    async (templateName: string, languageCode: string, parameters: string[], nameFormat: 'first' | 'full' = 'first', batch = { batchSize: 5, delayMin: 120, delayRandom: 30 }) => {
      setTemplateSending(true);
      try {
        // If sending to one or more groups (via group manager), call each group's send-template endpoint
        if (groupTemplateSendTarget) {
          const channelParam = backendChannel === 'personal' ? '?channel=personal' : '';
          const groupIds = groupTemplateSendTarget.groupIds;
          const { batchSize, delayMin, delayRandom } = batch;
          const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

          for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];
            try {
              const res = await fetchWithTenant(
                `/api/whatsapp-conversations/chat-groups/${groupId}/send-template${channelParam}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    template_name: templateName,
                    language_code: languageCode,
                    parameters,
                    name_format: nameFormat,
                  }),
                }
              );
              const data = await res.json();
              if (!data.success) console.error(`Group template send failed for ${groupId}:`, data.error);
            } catch (err) {
              console.error(`Group template send error for ${groupId}:`, err);
            }

            // Apply batch delay after every batchSize groups (skip delay after last group)
            const isLastGroup = i === groupIds.length - 1;
            const batchBoundary = (i + 1) % batchSize === 0;
            if (!isLastGroup && batchBoundary) {
              const delayMs = (delayMin + Math.random() * delayRandom) * 1000;
              await sleep(delayMs);
            }
          }
        } else if (selectedIds.size > 0) {
          // Bulk send to selected conversations
          // personal WA → /conversations/bulk/send-template  (Node.js controller)
          // WABA        → /conversations/bulk                (Python service, action: send-template)
          const channelParam = backendChannel ? `?channel=${backendChannel}` : '?channel=waba';
          const bulkEndpoint = backendChannel === 'personal'
            ? `/api/whatsapp-conversations/conversations/bulk/send-template${channelParam}`
            : `/api/whatsapp-conversations/conversations/bulk${channelParam}`;
          const res = await fetchWithTenant(bulkEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send-template',
              conversation_ids: Array.from(selectedIds),
              template_name: templateName,
              language_code: languageCode,
              parameters,
              name_format: nameFormat,
              batch_size: batch.batchSize,
              delay_min: batch.delayMin,
              delay_random: batch.delayRandom,
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

  // Called from ChatGroupManager single-group "Send Template" hover button
  const handleGroupTemplateSend = useCallback((groupId: string, conversationCount: number) => {
    setGroupTemplateSendTarget({ groupIds: [groupId], count: conversationCount });
    setIsTemplatePickerOpen(true);
  }, []);

  // Called from ChatGroupManager multi-select "Send Template" bar
  const handleGroupsTemplateSend = useCallback((selectedGroups: ChatGroup[]) => {
    const groupIds = selectedGroups.map(g => g.id);
    const totalCount = selectedGroups.reduce((acc, g) =>
      acc + (g.metadata?.wa_group && g.metadata.participant_count
        ? g.metadata.participant_count
        : g.conversation_count), 0);
    setGroupTemplateSendTarget({ groupIds, count: totalCount });
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
    <div className="h-full flex flex-col bg-card border-r border-border relative">
      {/* Search + New Chat + Select toggle */}
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
          {/* Refresh button — re-fetches conversations from backend */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 rounded-full hover:bg-muted"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh conversations"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          {/* Circular + button — opens WhatsApp-style New Chat panel */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 rounded-full hover:bg-muted"
            onClick={() => setIsNewChatOpen(true)}
            title="New chat"
          >
            <Plus className="h-4 w-4" />
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
          <AddToGroupDropdown selectedIds={selectedIds} onDone={exitSelectMode} channel={backendChannel} />
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

      {/* ── WhatsApp-style "New Chat" Panel Overlay ── */}
      {isNewChatOpen && (
        <div className="absolute inset-0 z-30 bg-card flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted flex-shrink-0"
              onClick={() => {
                setIsNewChatOpen(false);
                setNewChatSearch('');
                setSelectedNewChatIds(new Set());
                setSelectedNewChatGroupIds(new Set());
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold flex-1">New chat</span>
            {/* Selection count badge */}
            {(selectedNewChatIds.size > 0 || selectedNewChatGroupIds.size > 0) && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {selectedNewChatIds.size + selectedNewChatGroupIds.size} selected
              </span>
            )}
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or number"
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                className="pl-9 h-9 bg-secondary/50 rounded-full"
                autoFocus
              />
            </div>
          </div>

          {/* Action Items */}
          <div className="flex flex-col border-b border-border">
            {/* Import Leads */}
            <button
              onClick={() => {
                setIsNewChatOpen(false);
                setNewChatSearch('');
                setIsImportDialogOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium">Import Leads</span>
            </button>

            {/* Chat Groups */}
            <button
              onClick={() => {
                setIsNewChatOpen(false);
                setNewChatSearch('');
                setIsGroupManagerOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium">Chat Groups</span>
            </button>
          </div>

          {/* Scrollable Groups & Contacts list with checkboxes */}
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const searchLower = newChatSearch.toLowerCase();

              // Filter groups
              const filteredGroups = searchLower
                ? newChatGroups.filter((g) => g.name.toLowerCase().includes(searchLower))
                : newChatGroups;

              // Filter contacts — use newChatContacts once loaded, fall back to prop while loading
              const contactSource = newChatContacts.length > 0 ? newChatContacts : conversations;
              const filteredContacts = searchLower
                ? contactSource.filter((c) =>
                    (c.contact?.name || '').toLowerCase().includes(searchLower) ||
                    (c.contact?.phone || '').includes(searchLower)
                  )
                : contactSource;
              const contactsLoadedAll = newChatContactsTotal > 0 && newChatContacts.length >= newChatContactsTotal;

              const noResults = filteredGroups.length === 0 && filteredContacts.length === 0 && !newChatContactsLoading;

              return (
                <>
                  {/* ── Groups Section ── */}
                  {filteredGroups.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between">
                        {/* Collapse toggle */}
                        <button
                          onClick={() => setGroupsSectionExpanded(v => !v)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          {groupsSectionExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                          Groups
                        </button>
                        <div className="flex items-center gap-2">
                          {/* Select-all / Deselect-all */}
                          <button
                            onClick={() => {
                              const allGroupIds = filteredGroups.map(g => g.id);
                              const allSelected = allGroupIds.every(id => selectedNewChatGroupIds.has(id));
                              if (allSelected) {
                                setSelectedNewChatGroupIds(prev => {
                                  const next = new Set(prev);
                                  allGroupIds.forEach(id => next.delete(id));
                                  return next;
                                });
                              } else {
                                setSelectedNewChatGroupIds(prev => new Set([...prev, ...allGroupIds]));
                              }
                            }}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          >
                            {filteredGroups.every(g => selectedNewChatGroupIds.has(g.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedNewChatGroupIds.size}/{filteredGroups.length}
                          </span>
                        </div>
                      </div>
                      {groupsSectionExpanded && filteredGroups.map((group) => {
                        const isChecked = selectedNewChatGroupIds.has(group.id);
                        return (
                          <button
                            key={group.id}
                            onClick={() => {
                              setSelectedNewChatGroupIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(group.id)) next.delete(group.id);
                                else next.add(group.id);
                                return next;
                              });
                            }}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 w-full hover:bg-muted transition-colors',
                              isChecked && 'bg-emerald-50 dark:bg-emerald-950/20'
                            )}
                          >
                            {/* Checkbox */}
                            <div className={cn(
                              'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-slate-300 dark:border-slate-600'
                            )}>
                              {isChecked && (
                                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            {/* Group avatar */}
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: group.color || '#64748b' }}
                            >
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col items-start overflow-hidden">
                              <span className="text-sm font-medium truncate w-full text-left">
                                {group.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {group.conversation_count} member{group.conversation_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}


                  {/* ── Contacts Section ── */}
                  {filteredContacts.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between">
                        {/* Collapse toggle */}
                        <button
                          onClick={() => setContactsSectionExpanded(v => !v)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          {contactsSectionExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                          Contacts
                        </button>
                        <div className="flex items-center gap-2">
                          {/* Select-all / Deselect-all */}
                          <button
                            onClick={() => {
                              const allContactIds = filteredContacts.map(c => c.id);
                              const allSelected = allContactIds.every(id => selectedNewChatIds.has(id));
                              if (allSelected) {
                                setSelectedNewChatIds(prev => {
                                  const next = new Set(prev);
                                  allContactIds.forEach(id => next.delete(id));
                                  return next;
                                });
                              } else {
                                setSelectedNewChatIds(prev => new Set([...prev, ...allContactIds]));
                              }
                            }}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          >
                            {filteredContacts.every(c => selectedNewChatIds.has(c.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedNewChatIds.size}/{newChatContactsTotal > 0 ? newChatContactsTotal : filteredContacts.length}
                            {!contactsLoadedAll && newChatContactsTotal > 0 && (
                              <span className="text-amber-500 ml-1">({newChatContacts.length} loaded…)</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {contactsSectionExpanded && filteredContacts.map((conv) => {
                        const isChecked = selectedNewChatIds.has(conv.id);
                        return (
                          <button
                            key={conv.id}
                            onClick={() => {
                              setSelectedNewChatIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(conv.id)) next.delete(conv.id);
                                else next.add(conv.id);
                                return next;
                              });
                            }}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 w-full hover:bg-muted transition-colors',
                              isChecked && 'bg-emerald-50 dark:bg-emerald-950/20'
                            )}
                          >
                            {/* Checkbox */}
                            <div className={cn(
                              'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-slate-300 dark:border-slate-600'
                            )}>
                              {isChecked && (
                                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            {/* Contact avatar */}
                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
                              {(conv.contact?.name || '?')[0]?.toUpperCase()}
                            </div>
                            <div className="flex flex-col items-start overflow-hidden">
                              <span className="text-sm font-medium truncate w-full text-left">
                                {conv.contact?.name || displayPhone(conv.contact?.phone) || 'Unknown'}
                              </span>
                              {conv.contact?.phone && conv.contact?.name && (
                                <span className="text-xs text-muted-foreground truncate w-full text-left">
                                  {displayPhone(conv.contact.phone)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* No results */}
                  {noResults && newChatSearch && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No contacts or groups found</p>
                    </div>
                  )}

                  {/* Loading spinner — only while groups are fetching */}
                  {newChatGroupsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {/* Subtle footer while the full contact list is still loading in the background */}
                  {newChatContactsLoading && (
                    <p className="text-[10px] text-center text-muted-foreground py-2">Loading all contacts…</p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Bottom action bar — visible when items are selected */}
          {(selectedNewChatIds.size > 0 || selectedNewChatGroupIds.size > 0) && (
            <div className="px-4 py-3 border-t border-border bg-card flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9"
                onClick={() => {
                  // If any group is selected → open template picker (same as Send Template)
                  if (selectedNewChatGroupIds.size > 0) {
                    const selectedGroups = newChatGroups.filter(g => selectedNewChatGroupIds.has(g.id));
                    setIsNewChatOpen(false);
                    setNewChatSearch('');
                    setSelectedNewChatIds(new Set());
                    setSelectedNewChatGroupIds(new Set());
                    handleGroupsTemplateSend(selectedGroups);
                    return;
                  }
                  // Single contact → open that conversation
                  if (selectedNewChatIds.size === 1) {
                    const id = Array.from(selectedNewChatIds)[0];
                    setIsNewChatOpen(false);
                    setNewChatSearch('');
                    setSelectedNewChatIds(new Set());
                    setSelectedNewChatGroupIds(new Set());
                    onSelectConversation(id);
                    return;
                  }
                  // Multiple contacts → broadcast
                  setIsNewChatOpen(false);
                  setNewChatSearch('');
                  setSelectedNewChatIds(new Set());
                  setSelectedNewChatGroupIds(new Set());
                  onShowBroadcastModal?.();
                }}
              >
                {selectedNewChatGroupIds.size > 0 || selectedNewChatIds.size > 1 ? 'Send Broadcast' : 'Open Chat'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => {
                  setSelectedNewChatIds(new Set());
                  setSelectedNewChatGroupIds(new Set());
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chat Group Manager Dialog */}
      <ChatGroupManager
        open={isGroupManagerOpen}
        onOpenChange={setIsGroupManagerOpen}
        onSelectGroup={handleSelectGroup}
        onSendTemplateToGroup={handleGroupTemplateSend}
        onSendTemplateToGroups={handleGroupsTemplateSend}
        onOpenGroupInfo={onOpenGroupInfo}
        channel={backendChannel}
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
        channel={backendChannel ?? 'waba'}
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
