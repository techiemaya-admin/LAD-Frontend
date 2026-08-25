'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, X, Megaphone, UserPlus, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import type { ChatGroup } from './ChatGroupManager';
import { usePhoneMasking } from '@/hooks/usePhoneMasking';
import { BroadcastHistory, type GroupMessage } from './BroadcastHistory';

interface Member { id: string; name: string | null; phone: string | null; }

interface GroupInfoModalProps {
  open: boolean;
  onClose: () => void;
  group: ChatGroup | null;
  /** All loaded groups - used to resolve a broadcast list's member group ids → names. */
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
  const [tab, setTab] = useState<'members' | 'history'>('members');
  // Add by phone number rather than a contact picker: the API resolves a phone
  // to its conversation itself, so a picker would be a second source of truth
  // for who exists.
  const [addValue, setAddValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addNote, setAddNote] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
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

  // Reset to Members whenever a DIFFERENT group opens. Without this the modal
  // reopens on whichever tab was last used, showing another group's history
  // while it loads - which reads as the wrong data rather than as loading.
  useEffect(() => {
    setTab('members');
    setAddValue('');
    setAddNote(null);
    setMessages([]);
    setHistoryError(null);
  }, [group?.id]);

  // Fetched lazily: most opens are to check or edit membership, and the history
  // query spans every conversation in the group.
  useEffect(() => {
    if (!open || !group || tab !== 'history' || isBroadcastList) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    // broadcasts_only: without it this returns every message in every member
    // conversation - measured 36% agent replies on a live tenant - which would
    // render as "past broadcasts" that nobody sent.
    fetchWithTenant(
      `/api/whatsapp-conversations/chat-groups/${group.id}/messages?channel=${channel}&broadcasts_only=true&limit=500`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(Array.isArray(data?.data) ? data.data : []);
      })
      .catch(() => { if (!cancelled) setHistoryError('Could not load broadcast history'); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [open, group, tab, channel, isBroadcastList]);

  const addMembers = useCallback(async () => {
    const entries = addValue.split(/[\s,;\n]+/).map((v) => v.trim()).filter(Boolean);
    if (!entries.length || !group) return;
    setAdding(true); setAddNote(null); setError(null);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/${group.id}/conversations?channel=${channel}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_ids: entries }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);

      // Report what actually happened per entry. A number with no conversation
      // is silently skipped by the API, and "added" with nothing added is the
      // kind of quiet no-op that gets discovered at send time.
      const added = Number(data?.added ?? data?.count ?? 0);
      setAddNote(
        added === entries.length
          ? `Added ${added}.`
          : `Added ${added} of ${entries.length}. Numbers with no existing conversation are skipped.`,
      );
      setAddValue('');

      const r = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/${group.id}/members?channel=${channel}`,
      );
      const md = await r.json().catch(() => ({}));
      type RawMember = { id: string | number; name?: string | null; phone?: string | null };
      const rows: RawMember[] = Array.isArray(md?.members) ? md.members : (Array.isArray(md?.data) ? md.data : []);
      setMembers(rows.map((m) => ({ id: String(m.id), name: m.name ?? null, phone: m.phone ?? null })));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  }, [addValue, group, channel, onChanged]);

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

        {/* A broadcast LIST contains groups, not people, and has no send history
            of its own - so it keeps the single-list view rather than growing
            tabs that would both be wrong for it. */}
        {!isBroadcastList && (
          <div className="flex border-b border-border px-2">
            <button
              type="button"
              onClick={() => setTab('members')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'members'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Members
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'history'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Broadcasts
            </button>
          </div>
        )}

        {!isBroadcastList && tab === 'members' && (
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !adding) addMembers(); }}
                placeholder="Add by phone number, comma or space separated"
                className="flex-1 h-8 px-2.5 text-sm rounded-md border border-border bg-background
                           focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={addMembers}
                disabled={adding || !addValue.trim()}
                className="h-8 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium
                           disabled:opacity-50 hover:bg-emerald-700 flex items-center gap-1.5"
              >
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Add
              </button>
            </div>
            {addNote && <p className="text-[11px] text-muted-foreground mt-1.5">{addNote}</p>}
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto">
          {!isBroadcastList && tab === 'history' ? (
            <BroadcastHistory messages={messages} loading={historyLoading} error={historyError} />
          ) : (
          <>
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
          </>
          )}
          {error && <p className="px-5 py-2 text-sm text-red-500">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
