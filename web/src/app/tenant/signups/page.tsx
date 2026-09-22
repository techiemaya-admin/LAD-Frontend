"use client";
/**
 * /tenant/signups — the self-serve signup review queue (super-admin).
 *
 * Approve or reject applications; "Provision" hands an approved one to the
 * existing /tenant/onboard/new wizard, pre-filled, which is the only thing
 * that ever creates a database. On success the wizard stamps the application
 * `provisioned` with the new tenant id (see that page).
 *
 * Gate: same email rule as /tenant/onboard/new. The backend enforces it
 * independently on every call.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Loader2, Check, X, Rocket, RefreshCw, ExternalLink } from 'lucide-react';
import { PROVISION_HANDOFF_KEY, type SignupApplication } from '@/lib/signup-applications';

const SUPER_ADMIN_EMAIL = 'admin@techiemaya.com';

const STATUSES: Array<SignupApplication['status'] | 'all'> = ['pending', 'approved', 'provisioned', 'rejected', 'all'];

const badge: Record<SignupApplication['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  provisioned: 'bg-green-500/15 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function TenantSignupsPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('pending');
  const [rows, setRows] = useState<SignupApplication[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    getCurrentUser()
      .then((response) => {
        const raw = response as any;
        const email = (raw?.user?.email || raw?.email || '').toLowerCase().trim();
        setAuthState(email === SUPER_ADMIN_EMAIL ? 'allowed' : 'denied');
      })
      .catch(() => router.replace('/login?redirect_url=' + encodeURIComponent('/tenant/signups')));
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const qs = status === 'all' ? '' : `?status=${status}`;
      const r = await fetch(`/api/signup/applications${qs}`, { credentials: 'include', cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
      setRows(d.data || []);
      setSummary(d.summary || {});
    } catch (e: any) {
      setError(e.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { if (authState === 'allowed') load(); }, [authState, load]);

  const review = async (app: SignupApplication, next: 'approved' | 'rejected') => {
    setActing(app.id); setError(null);
    try {
      const r = await fetch(`/api/signup/applications/${app.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, notes: notes[app.id] || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Update failed.');
    } finally {
      setActing(null);
    }
  };

  const provision = (app: SignupApplication) => {
    // Hand the row to the wizard through sessionStorage (same browser, same
    // super-admin); the wizard reads it by id and stamps the result back.
    try { sessionStorage.setItem(PROVISION_HANDOFF_KEY, JSON.stringify(app)); } catch { /* wizard falls back to an empty form */ }
    router.push(`/tenant/onboard/new?application=${app.id}`);
  };

  // Same full-bleed dark canvas as /tenant/onboard/new: these internal pages
  // sit outside the tenant app shell and bring their own background.
  const Canvas = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#0d1117] text-gray-100"><div className="p-6 md:p-8 max-w-6xl mx-auto space-y-5">{children}</div></div>
  );

  if (authState === 'loading') return <Canvas><div className="text-gray-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Checking access…</div></Canvas>;
  if (authState === 'denied') return <Canvas><div className="text-red-400">Access denied.</div></Canvas>;

  return (
    <Canvas>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Signup applications</h1>
          <p className="text-sm text-gray-400">Verified identities that asked for a workspace. Approve, then provision through the wizard.</p>
        </div>
        <button onClick={load} disabled={loading} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-xs border ${status === s ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}>
            {s} {s !== 'all' && summary[s] != null ? <span className="ml-1 text-gray-500">{summary[s]}</span> : null}
          </button>
        ))}
      </div>

      {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 text-red-300 text-sm px-3 py-2">{error}</div>}

      {loading && rows.length === 0 ? (
        <div className="text-gray-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">Nothing {status === 'all' ? 'yet' : status}.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((app) => {
            const details = (app.details || {}) as Record<string, any>;
            return (
              <li key={app.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-white">{app.business_name}</h2>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge[app.status]}`}>{app.status}</span>
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/10 text-gray-400">{app.vertical}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {app.contact_name} · {app.contact_email || '—'} · {app.contact_phone || '—'}
                      {app.city ? ` · ${app.city}` : ''}{app.country ? `, ${app.country}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Verified via {app.provider}: {app.identity_email || (app.identity_phone ? `+${app.identity_phone}` : '—')} · {new Date(app.created_at).toLocaleString()}
                    </p>
                  </div>
                  {app.website && (
                    <a href={app.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      {app.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {(app.goal || details.services || details.booking_system || details.weekly_enquiries) && (
                  <div className="text-xs text-gray-300 space-y-1">
                    {app.goal && <p><span className="text-gray-500">Goal:</span> {app.goal}</p>}
                    {Array.isArray(details.services) && details.services.length > 0 && <p><span className="text-gray-500">Offers:</span> {details.services.join(', ')}</p>}
                    {details.booking_system && <p><span className="text-gray-500">Booking:</span> {String(details.booking_system)}</p>}
                    {details.weekly_enquiries && <p><span className="text-gray-500">Enquiries/week:</span> {String(details.weekly_enquiries)}</p>}
                  </div>
                )}

                {app.review_notes && <p className="text-xs text-gray-400"><span className="text-gray-500">Notes:</span> {app.review_notes}</p>}
                {app.tenant_id && <p className="text-xs text-green-400 font-mono">tenant {app.tenant_id}</p>}

                {app.status !== 'provisioned' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input value={notes[app.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [app.id]: e.target.value }))}
                      placeholder="Review note (optional)" className="flex-1 min-w-[180px] rounded-md bg-black/20 border border-white/10 px-2 py-1 text-xs text-gray-200 placeholder-gray-500" />
                    {app.status !== 'approved' && (
                      <button onClick={() => review(app, 'approved')} disabled={acting === app.id}
                        className="px-3 py-1 rounded-md text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 disabled:opacity-50"><Check size={12} /> Approve</button>
                    )}
                    {app.status === 'approved' && (
                      <button onClick={() => provision(app)} className="px-3 py-1 rounded-md text-xs bg-green-600 hover:bg-green-500 text-white flex items-center gap-1"><Rocket size={12} /> Provision</button>
                    )}
                    {app.status !== 'rejected' && (
                      <button onClick={() => review(app, 'rejected')} disabled={acting === app.id}
                        className="px-3 py-1 rounded-md text-xs bg-white/5 hover:bg-red-600/40 text-gray-300 flex items-center gap-1 disabled:opacity-50"><X size={12} /> Reject</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Canvas>
  );
}
