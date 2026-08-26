/**
 * MemberAvailabilityPanel
 *
 * Admin editor for when each member is generally willing to do a 1-2-1.
 *
 * The meeting broker RANKS candidate slots by these windows — it does not filter
 * on them. A member with nothing set is fully bookable on the chapter default,
 * and a member whose windows no longer intersect anyone still gets offers. That
 * distinction is stated in the UI because the natural assumption is the opposite,
 * and an admin who believes blank means "unavailable" will fill this in wrongly.
 *
 * Data source (proxied to LAD_backend/features/community-roi):
 *   GET /api/community-roi/availability
 *   PUT /api/community-roi/availability/:memberId   { windows: [...] }
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, Plus, Trash2, RefreshCw, Save, Check } from 'lucide-react';

interface Window {
  weekday: number;
  start_time: string;
  end_time: string;
  source?: string;
}

interface MemberAvailability {
  member_id: string;
  member_name: string;
  windows: Window[];
}

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

/** 'HH:MM:SS' from the API -> 'HH:MM' for <input type="time">. */
const toInput = (t: string) => (t || '').slice(0, 5);

export function MemberAvailabilityPanel() {
  const [members, setMembers] = useState<MemberAvailability[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Window[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/community-roi/availability', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (!res?.success) throw new Error(res?.error || 'Failed to load availability');
        setMembers(res.data || []);
      })
      .catch((e) => setError(e?.message || 'Failed to load availability'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const selected = useMemo(
    () => members.find((m) => m.member_id === selectedId) || null,
    [members, selectedId],
  );

  const select = (m: MemberAvailability) => {
    setSelectedId(m.member_id);
    setDraft(m.windows.map((w) => ({ ...w })));
    setErrors([]);
    setSaved(false);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? members.filter((m) => m.member_name?.toLowerCase().includes(q)) : members;
  }, [members, search]);

  const withWindows = members.filter((m) => m.windows.length > 0).length;

  const update = (i: number, patch: Partial<Window>) =>
    setDraft((d) => d.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setErrors([]);
    try {
      const res = await fetch(`/api/community-roi/availability/${selected.member_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          windows: draft.map((w) => ({
            weekday: Number(w.weekday),
            start_time: w.start_time,
            end_time: w.end_time,
          })),
        }),
      }).then((r) => r.json());

      // The API validates every row and returns all failures together, so the
      // admin fixes the whole grid in one pass instead of one error at a time.
      if (!res?.success) {
        if (Array.isArray(res?.errors) && res.errors.length) setErrors(res.errors);
        else setError(res?.error || 'Failed to save');
        return;
      }
      setMembers((list) =>
        list.map((m) => (m.member_id === selected.member_id ? { ...m, windows: res.windows || [] } : m)),
      );
      setDraft((res.windows || []).map((w: Window) => ({ ...w })));
      setSaved(true);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-500" />
            1-2-1 Availability
          </CardTitle>
          <CardDescription>
            When each member is generally happy to meet. The agent prefers these times when
            proposing a 1-2-1 — it does not restrict itself to them, so a member with nothing
            set stays fully bookable on the chapter default.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary">
            {withWindows} of {members.length} set
          </Badge>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
          {/* Member list */}
          <div className="min-w-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="mb-2 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            />
            <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200">
              {visible.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  {loading ? 'Loading…' : 'No members found'}
                </p>
              )}
              {visible.map((m) => (
                <button
                  key={m.member_id}
                  type="button"
                  onClick={() => select(m)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 ${
                    m.member_id === selectedId ? 'bg-indigo-50 font-medium' : ''
                  }`}
                >
                  <span className="truncate">{m.member_name}</span>
                  {m.windows.length > 0 ? (
                    <Badge variant="secondary" className="shrink-0">
                      {m.windows.length}
                    </Badge>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">chapter default</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="min-w-0">
            {!selected ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Select a member to set the times they prefer for 1-2-1s.
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="truncate font-medium text-slate-800">{selected.member_name}</h4>
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                    <Button size="sm" onClick={save} disabled={saving}>
                      <Save className="mr-1.5 h-4 w-4" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>

                {errors.length > 0 && (
                  <ul className="mb-3 list-disc space-y-0.5 rounded-md bg-amber-50 px-5 py-2 text-sm text-amber-800">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  {draft.length === 0 && (
                    <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-600">
                      No windows set — this member is offered the chapter&apos;s default working
                      hours. Add a window to steer the agent toward times they prefer.
                    </p>
                  )}

                  {draft.map((w, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <select
                        value={w.weekday}
                        onChange={(e) => update(i, { weekday: Number(e.target.value) })}
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                      >
                        {DAYS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={toInput(w.start_time)}
                        onChange={(e) => update(i, { start_time: e.target.value })}
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <span className="text-sm text-slate-400">to</span>
                      <input
                        type="time"
                        value={toInput(w.end_time)}
                        onChange={(e) => update(i, { end_time: e.target.value })}
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}
                        aria-label="Remove window"
                      >
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDraft((d) => [...d, { weekday: 2, start_time: '09:00', end_time: '12:00' }])
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add window
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MemberAvailabilityPanel;
