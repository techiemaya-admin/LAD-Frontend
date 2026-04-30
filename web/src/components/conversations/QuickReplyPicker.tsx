import { useState, useEffect, useMemo, useCallback } from 'react';
import { Zap, Search, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QuickReply } from '@/types/conversation';

const API_BASE = '/api/whatsapp-conversations/quick-replies';

interface QuickReplyPickerProps {
  onSelect: (content: string) => void;
  contactName?: string;
  disabled?: boolean;
}

export function QuickReplyPicker({ onSelect, contactName, disabled }: QuickReplyPickerProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newShortcut, setNewShortcut] = useState('');

  const fetchReplies = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (data.success) setReplies(data.data || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchReplies();
  }, [isOpen, fetchReplies]);

  const filtered = useMemo(() => {
    if (!search) return replies;
    const q = search.toLowerCase();
    return replies.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.shortcut?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
    );
  }, [replies, search]);

  const categories = useMemo(() => {
    const cats = new Set(replies.map((r) => r.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [replies]);

  const handleSelect = useCallback(
    (reply: QuickReply) => {
      let content = reply.content;
      if (contactName) {
        content = content.replace(/\{contact_name\}/g, contactName);
      }
      onSelect(content);
      setIsOpen(false);
      setSearch('');
    },
    [onSelect, contactName]
  );

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          category: newCategory.trim() || null,
          shortcut: newShortcut.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplies((prev) => [...prev, data.data]);
        setNewTitle('');
        setNewContent('');
        setNewCategory('');
        setNewShortcut('');
      }
    } catch {
      // silently fail
    }
  }, [newTitle, newContent, newCategory, newShortcut]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        setReplies((prev) => prev.filter((r) => r.id !== id));
      } catch {
        // silently fail
      }
    },
    []
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          title="Quick replies"
        >
          <Zap className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Quick Replies</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setIsManaging(!isManaging)}
            >
              {isManaging ? 'Done' : 'Manage'}
            </Button>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quick replies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Create new (when managing) */}
        {isManaging && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground">Create New</p>
            <Input
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Textarea
              placeholder="Content (use {contact_name} for variable)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Input
                placeholder="Shortcut (e.g. /hello)"
                value={newShortcut}
                onChange={(e) => setNewShortcut(e.target.value)}
                className="h-8 text-sm flex-1"
              />
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newContent.trim()}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Quick Reply
            </Button>
          </div>
        )}

        {/* Reply list */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {replies.length === 0 ? 'No quick replies yet. Click "Manage" to create one.' : 'No matches found.'}
              </p>
            ) : (
              filtered.map((reply) => (
                <div
                  key={reply.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer group"
                  onClick={() => !isManaging && handleSelect(reply)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{reply.title}</span>
                      {reply.shortcut && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                          {reply.shortcut}
                        </Badge>
                      )}
                      {reply.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                          {reply.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {reply.content}
                    </p>
                  </div>
                  {isManaging && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(reply.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
