import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, AlertCircle, Check, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeStorage } from '@lad/shared/storage';
import { cn } from '@/lib/utils';

interface ChatGroup {
  id: string;
  name: string;
  color: string;
  conversation_count: number;
}

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

const API_BASE = '/api/whatsapp-conversations/chat-groups';

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${safeStorage.getItem('token') || ''}`,
  };
}

interface CreateBroadcastGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess?: () => void;
  channel?: 'personal' | 'waba';
}

export function CreateBroadcastGroupModal({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
  channel,
}: CreateBroadcastGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingGroups, setExistingGroups] = useState<ChatGroup[]>([]);
  const [selectedExistingGroups, setSelectedExistingGroups] = useState<Set<string>>(new Set());
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch existing groups when modal opens
  useEffect(() => {
    if (!open) return;

    setGroupsLoading(true);
    const channelParam = channel === 'personal' ? '?channel=personal' : '';
    fetch(`${API_BASE}${channelParam}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const groups = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setExistingGroups(groups);
      })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, [open, channel]);

  const handleCreate = useCallback(async () => {
    // Validate: must either create new group or add to existing groups
    if (!groupName.trim() && selectedExistingGroups.size === 0) {
      setError('Please enter a group name or select existing groups');
      return;
    }

    if (selectedIds.length === 0) {
      setError('No contacts selected');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const channelParam = channel === 'personal' ? '?channel=personal' : '';
      const groupsToAddTo: string[] = [];

      // Step 1: Create new group if name is provided
      if (groupName.trim()) {
        const createRes = await fetch(`${API_BASE}${channelParam}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            name: groupName.trim(),
            color: selectedColor,
            description: null,
          }),
        });

        const createData = await createRes.json();

        let newGroupId: string | null = null;
        if (createData.success && createData.group?.id) {
          newGroupId = createData.group.id;
        } else if (createData.success && createData.data?.id) {
          newGroupId = createData.data.id;
        } else if (createData.id) {
          newGroupId = createData.id;
        }

        if (!newGroupId) {
          // Handle 409 conflict (group already exists)
          if (createRes.status === 409) {
            const listRes = await fetch(`${API_BASE}${channelParam}`, {
              headers: authHeaders(),
            });
            const listData = await listRes.json();
            const groups = listData.data || listData || [];
            const existing = groups.find(
              (g: any) => g.name.toLowerCase() === groupName.trim().toLowerCase()
            );
            if (existing) {
              newGroupId = existing.id;
            }
          }
        }

        if (!newGroupId) {
          setError('Failed to create group. Please try again.');
          return;
        }

        groupsToAddTo.push(newGroupId);
      }

      // Step 2: Add existing groups to the list
      groupsToAddTo.push(...Array.from(selectedExistingGroups));

      // Step 3: Add conversations to all selected/created groups
      for (const groupId of groupsToAddTo) {
        const addRes = await fetch(`${API_BASE}/${groupId}/conversations${channelParam}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ conversation_ids: selectedIds }),
        });

        const addData = await addRes.json();

        if (!addData.success && !addRes.ok) {
          setError(`Failed to add contacts to group. Please try again.`);
          return;
        }
      }

      // Success!
      let message = '';
      if (groupName.trim() && selectedExistingGroups.size > 0) {
        message = `Created "${groupName}" and added to ${selectedExistingGroups.size} group${selectedExistingGroups.size !== 1 ? 's' : ''}!`;
      } else if (groupName.trim()) {
        message = `Created "${groupName}" successfully!`;
      } else {
        message = `Added to ${selectedExistingGroups.size} group${selectedExistingGroups.size !== 1 ? 's' : ''}!`;
      }

      setSuccessMessage(message);
      setGroupName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setSelectedExistingGroups(new Set());

      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('Error creating broadcast group:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [groupName, selectedColor, selectedIds, selectedExistingGroups, channel, onOpenChange, onSuccess]);

  const handleClose = useCallback(() => {
    if (!isLoading && !successMessage) {
      setGroupName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setSelectedExistingGroups(new Set());
      setError('');
      onOpenChange(false);
    }
  }, [isLoading, successMessage, onOpenChange]);

  if (!open) return null;

  // Show success state
  if (successMessage) {
    return (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="w-full max-w-sm mx-4 bg-card rounded-lg shadow-xl border border-border">
            <div className="p-6 space-y-4 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </motion.div>
              <h2 className="text-lg font-semibold">{successMessage}</h2>
              <p className="text-sm text-muted-foreground">Closing in a moment...</p>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="w-full max-w-sm mx-4 bg-card rounded-lg shadow-xl border border-border">
          <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Broadcast Group</h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            Creating a group with <span className="font-semibold text-foreground">{selectedIds.length}</span> contact{selectedIds.length !== 1 ? 's' : ''}
          </div>

          {/* Group Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              placeholder="e.g., Sales Leads, Premium Prospects..."
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="h-9"
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-offset-background'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          {existingGroups.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-card text-muted-foreground">OR</span>
              </div>
            </div>
          )}

          {/* Add to Existing Groups */}
          {existingGroups.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Add to Existing Groups</label>
              {groupsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {existingGroups.map((group) => {
                    const isChecked = selectedExistingGroups.has(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedExistingGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(group.id)) {
                              next.delete(group.id);
                            } else {
                              next.add(group.id);
                            }
                            return next;
                          });
                          setError('');
                        }}
                        disabled={isLoading}
                        className={cn(
                          'w-full flex items-center gap-2 p-2 rounded-md border transition-colors text-left',
                          isChecked
                            ? 'border-emerald-300 bg-emerald-50/50'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <div className={cn(
                          'h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-300 dark:border-slate-600'
                        )}>
                          {isChecked && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {group.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {group.conversation_count} member{group.conversation_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isLoading || (!groupName.trim() && selectedExistingGroups.size === 0)}
              className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  {groupName.trim() && selectedExistingGroups.size > 0
                    ? 'Creating & Adding...'
                    : groupName.trim()
                    ? 'Creating...'
                    : 'Adding...'}
                </>
              ) : (
                <>
                  {groupName.trim() && selectedExistingGroups.size > 0
                    ? `Create & Add to ${selectedExistingGroups.size} Group${selectedExistingGroups.size !== 1 ? 's' : ''}`
                    : groupName.trim()
                    ? 'Create Group'
                    : `Add to ${selectedExistingGroups.size} Group${selectedExistingGroups.size !== 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
