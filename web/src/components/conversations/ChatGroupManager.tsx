import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Send,
  Trash2,
  Edit3,
  X,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
}

// ── Color palette for new groups ─────────────────────────────────

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

// ── API helpers ──────────────────────────────────────────────────

const API_BASE = '/api/whatsapp-conversations/chat-groups';

async function fetchGroups(): Promise<ChatGroup[]> {
  const res = await fetch(API_BASE);
  const data = await res.json();
  return data.success ? data.data : [];
}

async function createGroup(name: string, color: string, description?: string): Promise<ChatGroup | null> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, description: description || null }),
  });
  const data = await res.json();
  return data.success ? data.data : null;
}

async function updateGroup(id: string, updates: { name?: string; color?: string; description?: string }): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.success;
}

async function deleteGroup(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

// ── Component ────────────────────────────────────────────────────

export function ChatGroupManager({
  open,
  onOpenChange,
  onSelectGroup,
  onSendTemplateToGroup,
}: ChatGroupManagerProps) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newDesc, setNewDesc] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Load groups when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchGroups()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

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
    if (ok) setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const startEdit = useCallback((group: ChatGroup) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    const ok = await updateGroup(editingId, { name: editName.trim(), color: editColor });
    if (ok) {
      setGroups((prev) =>
        prev.map((g) => (g.id === editingId ? { ...g, name: editName.trim(), color: editColor } : g))
      );
      setEditingId(null);
    }
  }, [editingId, editName, editColor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chat Groups
          </DialogTitle>
        </DialogHeader>

        {/* Create group toggle */}
        {!isCreating ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create New Group
          </Button>
        ) : (
          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
            <Input
              placeholder="Group name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Color:</span>
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
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setIsCreating(false); setNewName(''); setNewDesc(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Groups list */}
        <ScrollArea className="flex-1 max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No groups yet</p>
              <p className="text-xs mt-1">Create a group to organize conversations</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
                <div key={group.id}>
                  {editingId === group.id ? (
                    /* Inline edit */
                    <div className="p-2 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
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
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-[10px] flex-1" onClick={handleUpdate}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Group row */
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        onClick={() => {
                          onSelectGroup(group);
                          onOpenChange(false);
                        }}
                      >
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm font-medium truncate">{group.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 flex-shrink-0">
                          {group.conversation_count}
                        </Badge>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Send template to group"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendTemplateToGroup(group.id, group.conversation_count);
                            onOpenChange(false);
                          }}
                        >
                          <Send className="h-3 w-3 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Edit group"
                          onClick={(e) => { e.stopPropagation(); startEdit(group); }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Delete group"
                          onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
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
        headers: { 'Content-Type': 'application/json' },
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
      <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50 py-1">
        <div className="flex items-center justify-between px-2 py-1 border-b border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Add to Group</span>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-3 text-center">No groups. Create one first.</p>
        ) : (
          groups.map((g) => (
            <button
              key={g.id}
              onClick={() => handleAddToGroup(g.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 transition-colors text-left"
            >
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
              <span className="text-xs truncate">{g.name}</span>
              <Badge variant="secondary" className="text-[9px] px-1 h-3.5 ml-auto">{g.conversation_count}</Badge>
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
