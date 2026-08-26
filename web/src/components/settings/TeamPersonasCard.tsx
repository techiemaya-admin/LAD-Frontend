'use client';

/**
 * Team personas — per-user agent voice, and which WhatsApp number is whose.
 *
 * For tenants where several sales people each connect their own number and
 * share one conversation database. Everything a person does not set keeps
 * inheriting from the tenant settings above, so this screen only ever edits
 * the DIFFERENCE from the default.
 *
 * That inheritance is the reason the editor sends only changed fields. Saving
 * every field on every edit would pin the untouched ones at whatever the tenant
 * default happened to be that day, and they would silently stop tracking it —
 * which is invisible until somebody changes the tenant default and wonders why
 * half the team did not follow.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, UserCog } from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

const PERSONAS_API = '/api/whatsapp-conversations/personas';
const USERS_API = '/api/users';
const ACCOUNTS_API = '/api/whatsapp-conversations/admin/whatsapp-accounts';

/** Only these inherit. Tenant-wide facts are deliberately not per-person. */
const FIELDS = [
  { key: 'tone', label: 'Tone', placeholder: 'professional' },
  { key: 'language', label: 'Language', placeholder: 'en' },
  { key: 'ai_model', label: 'AI model', placeholder: 'inherits tenant model' },
  { key: 'timezone', label: 'Timezone', placeholder: 'UTC' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

type TeamUser = { id: string; email?: string; first_name?: string; last_name?: string };
type Account = { slug: string; display_name?: string; display_phone_number?: string; user_id?: string | null };
type Override = Partial<Record<FieldKey | 'knowledge_base', string | number | null>> & { user_id?: string };

const nameOf = (u: TeamUser) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || u.id;

export function TeamPersonasCard({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [loading, setLoading] = useState(true);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<Override>({});
  const [busy, setBusy] = useState<string>('');

  const load = useCallback(async () => {
    // Independent sources: a tenant with no personas yet, or whose overrides
    // migration has not landed, must still render the team and their numbers.
    const [uRes, pRes, aRes] = await Promise.allSettled([
      fetchWithTenant(USERS_API),
      fetchWithTenant(PERSONAS_API),
      fetchWithTenant(ACCOUNTS_API),
    ]);

    if (uRes.status === 'fulfilled' && uRes.value.ok) {
      const d = await uRes.value.json();
      setUsers(Array.isArray(d) ? d : d?.users || d?.data || []);
    }
    if (pRes.status === 'fulfilled' && pRes.value.ok) {
      const d = await pRes.value.json();
      const map: Record<string, Override> = {};
      for (const p of d?.personas || []) if (p?.user_id) map[String(p.user_id)] = p;
      setOverrides(map);
    }
    if (aRes.status === 'fulfilled' && aRes.value.ok) {
      const d = await aRes.value.json();
      setAccounts(Array.isArray(d) ? d : d?.accounts || d?.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const numbersByUser = useMemo(() => {
    const m: Record<string, Account[]> = {};
    for (const a of accounts) {
      if (!a.user_id) continue;
      (m[String(a.user_id)] ||= []).push(a);
    }
    return m;
  }, [accounts]);

  const unassigned = useMemo(() => accounts.filter((a) => !a.user_id), [accounts]);

  const assignNumber = async (slug: string, userId: string) => {
    setBusy(slug);
    try {
      const res = await fetchWithTenant(`${ACCOUNTS_API}/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // '' clears the owner. Distinct from omitting the field, which would
        // leave whoever owns it untouched.
        body: JSON.stringify({ owner_user_id: userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(userId ? 'Number assigned.' : 'Number is now tenant-wide.', 'success');
      await load();
    } catch {
      showToast('Could not change the number owner.', 'error');
    } finally {
      setBusy('');
    }
  };

  const openEditor = (userId: string) => {
    setOpenFor(userId);
    setDraft({ ...(overrides[userId] || {}) });
  };

  const savePersona = async () => {
    if (!openFor) return;
    const current = overrides[openFor] || {};
    // Send ONLY what changed. An unchanged field must stay absent so it keeps
    // inheriting rather than being pinned to its current resolved value.
    const changed: Record<string, string | number | null> = {};
    for (const { key } of FIELDS) {
      const before = current[key] ?? null;
      const after = (draft[key] ?? '') === '' ? null : draft[key]!;
      if (String(before ?? '') !== String(after ?? '')) changed[key] = after;
    }
    if (Object.keys(changed).length === 0) {
      setOpenFor(null);
      return;
    }

    setBusy(openFor);
    try {
      const res = await fetchWithTenant(`${PERSONAS_API}/${encodeURIComponent(openFor)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Persona saved.', 'success');
      setOpenFor(null);
      await load();
    } catch {
      showToast('Could not save the persona.', 'error');
    } finally {
      setBusy('');
    }
  };

  const resetPersona = async (userId: string) => {
    setBusy(userId);
    try {
      const res = await fetchWithTenant(`${PERSONAS_API}/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Back to the team default.', 'success');
      setOpenFor(null);
      await load();
    } catch {
      showToast('Could not reset the persona.', 'error');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center gap-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <div className="flex items-start gap-3">
        <UserCog className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-medium text-gray-900">Team personas</h3>
          <p className="text-sm text-gray-600">
            Give each person their own voice on their own WhatsApp number. Anything
            left blank keeps following the team settings above.
          </p>
        </div>
      </div>

      {users.length === 0 && (
        <p className="text-sm text-gray-500">No team members yet.</p>
      )}

      <ul className="divide-y divide-gray-100">
        {users.map((u) => {
          const has = !!overrides[u.id];
          const numbers = numbersByUser[u.id] || [];
          return (
            <li key={u.id} className="py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{nameOf(u)}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {numbers.length > 0
                      ? numbers.map((n) => n.display_phone_number || n.slug).join(', ')
                      : 'No number assigned'}
                    {' · '}
                    {has ? 'Own persona' : 'Team default'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {has && (
                    <button
                      type="button"
                      onClick={() => resetPersona(u.id)}
                      disabled={busy === u.id}
                      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      title="Go back to the team default"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditor(u.id)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {has ? 'Edit persona' : 'Customise'}
                  </button>
                </div>
              </div>

              {openFor === u.id && (
                <div className="mt-3 p-4 bg-gray-50 rounded border border-gray-200 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FIELDS.map((f) => (
                      <label key={f.key} className="block">
                        <span className="block text-sm text-gray-700 mb-1">{f.label}</span>
                        <input
                          type="text"
                          value={String(draft[f.key] ?? '')}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Leave a box empty to follow the team setting for that field.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={savePersona}
                      disabled={busy === u.id}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {busy === u.id ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenFor(null)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {unassigned.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Unassigned numbers</h4>
          <p className="text-xs text-gray-500 mb-3">
            These answer with the team default until somebody owns them.
          </p>
          <ul className="space-y-2">
            {unassigned.map((a) => (
              <li key={a.slug} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-gray-700">
                  {a.display_phone_number || a.display_name || a.slug}
                </span>
                <select
                  defaultValue=""
                  disabled={busy === a.slug}
                  onChange={(e) => e.target.value && assignNumber(a.slug, e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="">Assign to…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{nameOf(u)}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
