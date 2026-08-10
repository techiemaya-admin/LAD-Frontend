'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, X, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import type { ChatGroup } from './ChatGroupManager';
import { usePhoneMasking } from '@/hooks/usePhoneMasking';

interface Member { id: string; name: string | null; phone: string | null; }

interface GroupInfoModalProps {
  open: boolean;
  onClose: () => void;
  group: ChatGroup | null;
  /** All loaded groups — used to resolve a broadcast list's member group ids → names. */
  allGroups: ChatGroup[];
  channel: 'personal' | 'waba';
  onChanged?: () => void;
}

/**
 * Group Info for a broadcast group. A broadcast LIST shows its member chat groups;
 * a regular group shows its members. Either can be removed inline.
 */
export function GroupInfoModal({ open, onClose, group, allGroups, channel, onChanged }: GroupInfoModalProps) {
  // Group members frequently have no pushname, so this list is one of the
  // densest concentrations of raw phone numbers in the product.
  const { displayPhone, displayNameOrPhone } = usePhoneMasking();
  const isBroadcastList = !!(group?.metadata as { is_broadcast_list?: boolean } | undefined)?.is_broadcast_list;
  const [memberGroupIds, setMemberGroupIds] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !group) return;
    setError(null);
    if (isBroadcastList) {
      const ids = Array.isArray((group.metadata as { member_group_ids?: unknown[] } | undefined)?.member_group_ids)
        ? (group.metadata as { member_group_ids?: unknown[] }).member_group_ids!.map(String)
        : [];
      setMemberGroupIds(ids);
      setMembers([]);
    } else {
      setMemberGroupIds([]);
      setLoading(true);
      fetchWithTenant(`/api/whatsapp-conversations/chat-groups/${group.id}/members?channel=${channel}`)
        .then((r) => r.json())
        .then((data) => {
          const rows: any[] = Array.isArray(data?.members) ? data.members : (Array.isArray(data?.data) ? data.data : []);
          setMembers(rows.map((m: any) => ({ id: String(m.id), name: m.name ?? null, phone: m.phone ?? null })));
        })
        .catch(() => setError('Could not load members'))
        .finally(() => setLoading(false));
    }
  }, [open, group, isBroadcastList, channel]);

  const memberGroups = memberGroupIds.map((id) => {
    const g = allGroups.find((x) => String(x.id) === id);
    return { id, name: g?.name || id };
  });

  const removeGroup = useCallback(async (gid: string) => {
    if (!group || removingId) return;
    setRemovingId(gid); setError(null);
    try {
      const res = await fetchWithTenant(`/api/whatsapp-conversations/chat-groups/broadcast-lists?channel=${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: group.id, remove_group_ids: [gid] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const ids = Array.isArray(data?.group?.metadata?.member_group_ids)
        ? data.group.metadata.member_group_ids.map(String)
        : memberGroupIds.filter((x) => x !== gid);
      setMemberGroupIds(ids);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  }, [group, removingId, channel, memberGroupIds, onChanged]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!group || removingId) return;
    setRemovingId(memberId); setError(null);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/${group.id}/members/${memberId}?channel=${channel}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `HTTP ${res.status}`);
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  }, [group, removingId, channel, onChanged]);

  if (!group) return null;
  const count = isBroadcastList ? memberGroups.length : members.length;
  const isEmpty = isBroadcastList ? memberGroups.length === 0 : members.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            {isBroadcastList ? <Megaphone className="h-5 w-5 text-emerald-600" /> : <Users className="h-5 w-5 text-emerald-600" />}
            {group.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBroadcastList ? `${count} chat group${count === 1 ? '' : 's'}` : `${count} member${count === 1 ? '' : 's'}`}
          </p>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : isEmpty ? (
            <div className="py-12 text-center text-sm text-muted-foreground px-6">
              {isBroadcastList ? 'No chat groups in this broadcast group.' : 'No members in this group.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {isBroadcastList
                ? memberGroups.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/90 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <span className="flex-1 text-sm truncate">{g.name}</span>
                      <button
                        type="button"
                        onClick={() => removeGroup(g.id)}
                        disabled={removingId === g.id}
                        title="Remove from broadcast group"
                        aria-label={`Remove ${g.name}`}
                        className="shrink-0 text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      >
                        {removingId === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </li>
                  ))
                : members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="h-8 w-8 rounded-full bg-violet-500/90 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {displayNameOrPhone(m.name, m.phone, '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{displayNameOrPhone(m.name, m.phone)}</p>
                        {m.name && m.phone && <p className="text-[11px] text-muted-foreground truncate">{displayPhone(m.phone)}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        title="Remove member"
                        aria-label={`Remove ${displayNameOrPhone(m.name, m.phone)}`}
                        className="shrink-0 text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      >
                        {removingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
            </ul>
          )}
          {error && <p className="px-5 py-2 text-sm text-red-500">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
