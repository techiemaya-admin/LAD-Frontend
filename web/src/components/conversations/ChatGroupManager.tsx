import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Send,
  Trash2,
  Edit3,
  X,
  Loader2,
  FolderPlus,
  MessageCircle,
  ChevronRight,
  Search,
  Info,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/utils/storage';

// ── Types ────────────────────────────────────────────────────────

export interface ChatGroup {
  id: string;
  name: string;
  color: string;
  description: string | null;
  conversation_count: number;
  created_at: string | null;
}

interface ChatGroupManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGroup: (group: ChatGroup) => void;
  onSendTemplateToGroup: (groupId: string, conversationCount: number) => void;
  onOpenGroupInfo?: (group: ChatGroup) => void;
}

// ── Color palette for new groups ─────────────────────────────────

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

// ── API helpers ──────────────────────────────────────────────────

const API_BASE = '/api/whatsapp-conversations/chat-groups';

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${safeStorage.getItem('token') || ''}`,
  };
}

async function fetchGroups(): Promise<ChatGroup[]> {
  const res = await fetch(API_BASE, { headers: authHeaders() });
  const data = await res.json();
  return data.success ? data.data : [];
}

async function createGroup(name: string, color: string, description?: string): Promise<ChatGroup | null> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, color, description: description || null }),
  });
  const data = await res.json();
  return data.success ? data.data : null;
}

async function updateGroup(id: string, updates: { name?: string; color?: string; description?: string }): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.success;
}

async function deleteGroup(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.success;
}

// ── WhatsApp-style Group Avatar ──────────────────────────────────

function GroupAvatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-lg',
  };

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback
        className="font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {initials || <Users className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

// ── Component ────────────────────────────────────────────────────

export function ChatGroupManager({
  open,
  onOpenChange,
  onSelectGroup,
  onSendTemplateToGroup,
  onOpenGroupInfo,
}: ChatGroupManagerProps) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newDesc, setNewDesc] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Load groups when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchGroups()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setIsCreating(false);
      setEditingId(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const filteredGroups = searchQuery
    ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups;

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const group = await createGroup(newName.trim(), newColor, newDesc.trim() || undefined);
    if (group) {
      setGroups((prev) => [...prev, group]);
      setNewName('');
      setNewDesc('');
      setNewColor(COLOR_OPTIONS[0]);
      setIsCreating(false);
    }
  }, [newName, newColor, newDesc]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteGroup(id);
    if (ok) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setConfirmDeleteId(null);
    }
  }, []);

  const startEdit = useCallback((group: ChatGroup) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color);
    setEditDesc(group.description || '');
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    const ok = await updateGroup(editingId, {
      name: editName.trim(),
      color: editColor,
      description: editDesc.trim() || undefined,
    });
    if (ok) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingId
            ? { ...g, name: editName.trim(), color: editColor, description: editDesc.trim() || null }
            : g
        )
      );
      setEditingId(null);
    }
  }, [editingId, editName, editColor, editDesc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header - WhatsApp style teal/dark header */}
        <div className="bg-primary/5 border-b border-border px-4 py-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Chat Groups
              <Badge variant="secondary" className="text-[10px] ml-1">
                {groups.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8 bg-background"
            />
          </div>
        </div>

        {/* New Group button */}
        <div className="px-2 py-2 border-b border-border">
          {!isCreating ? (
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
              onClick={() => setIsCreating(true)}
            >
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">New Group</p>
                <p className="text-[11px] text-muted-foreground">Create a group to organize conversations</p>
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
              <Input
                placeholder="Group name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Input
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground mr-1 font-medium">Color:</span>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      'h-5 w-5 rounded-full transition-all',
                      newColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-8 text-xs flex-1" onClick={handleCreate} disabled={!newName.trim()}>
                  Create Group
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setIsCreating(false); setNewName(''); setNewDesc(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Groups list - WhatsApp style */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Users className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">
                {searchQuery ? 'No groups found' : 'No groups yet'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try a different search' : 'Create a group to get started'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredGroups.map((group) => (
                <div key={group.id}>
                  {editingId === group.id ? (
                    /* Inline edit mode */
                    <div className="mx-2 my-1 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <GroupAvatar name={editName || group.name} color={editColor} size="sm" />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                        />
                      </div>
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        className="h-7 text-xs"
                      />
                      <div className="flex items-center gap-1">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={cn(
                              'h-4 w-4 rounded-full transition-all',
                              editColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1.5 pt-0.5">
                        <Button size="sm" className="h-7 text-[11px] flex-1" onClick={handleUpdate}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : confirmDeleteId === group.id ? (
                    /* Delete confirmation */
                    <div className="mx-2 my-1 p-3 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center gap-3">
                      <GroupAvatar name={group.name} color={group.color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Delete &quot;{group.name}&quot;?</p>
                        <p className="text-[11px] text-muted-foreground">This cannot be undone</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-[11px]"
                          onClick={() => handleDelete(group.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* WhatsApp-style group row */
                    <div
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer group/row border-b border-border/30 last:border-b-0"
                      onClick={() => {
                        onSelectGroup(group);
                        onOpenChange(false);
                      }}
                    >
                      <GroupAvatar name={group.name} color={group.color} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{group.name}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            <Users className="h-3 w-3 inline mr-1" />
                            {group.conversation_count} conversation{group.conversation_count !== 1 ? 's' : ''}
                            {group.description ? ` · ${group.description}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons - visible on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                        {onOpenGroupInfo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Group info"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenGroupInfo(group);
                              onOpenChange(false);
                            }}
                          >
                            <Info className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Broadcast to group"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendTemplateToGroup(group.id, group.conversation_count);
                            onOpenChange(false);
                          }}
                        >
                          <Send className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit group"
                          onClick={(e) => { e.stopPropagation(); startEdit(group); }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Delete group"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(group.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Add to Group Dropdown ────────────────────────────────────────

interface AddToGroupDropdownProps {
  selectedIds: Set<string>;
  onDone: () => void;
}

export function AddToGroupDropdown({ selectedIds, onDone }: AddToGroupDropdownProps) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(() => {
    setLoading(true);
    fetchGroups()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddToGroup = useCallback(async (groupId: string) => {
    if (selectedIds.size === 0) return;
    try {
      await fetch(`${API_BASE}/${groupId}/conversations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_ids: Array.from(selectedIds) }),
      });
    } catch (err) {
      console.error('Error adding to group:', err);
    }
    setIsOpen(false);
    onDone();
  }, [selectedIds, onDone]);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-violet-600"
        onClick={() => { setIsOpen(true); loadGroups(); }}
      >
        <FolderPlus className="h-3.5 w-3.5 mr-1" />
        Add to Group
      </Button>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-full left-0 mb-1 w-56 rounded-xl border border-border bg-card shadow-xl z-50 py-1 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add to Group</span>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-4 text-center">No groups. Create one first.</p>
        ) : (
          groups.map((g) => (
            <button
              key={g.id}
              onClick={() => handleAddToGroup(g.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
            >
              <GroupAvatar name={g.name} color={g.color} size="sm" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium truncate block">{g.name}</span>
                <span className="text-[10px] text-muted-foreground">{g.conversation_count} chats</span>
              </div>
            </button>
          ))
        )}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs text-violet-600">
        <FolderPlus className="h-3.5 w-3.5 mr-1" />
        Add to Group
      </Button>
    </div>
  );
}
