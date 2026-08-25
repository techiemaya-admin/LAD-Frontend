'use client';

/**
 * "Who is this accelerator actually going to contact?"
 *
 * Shown against the connection-request node, because that is the step that
 * puts a real message in front of a real person. Until now the only way to
 * find out was to launch and watch the leads arrive, which is a bad moment to
 * discover the targeting is wrong - connection requests cannot be unsent, and
 * a burst of badly-matched ones is what gets a LinkedIn account restricted.
 *
 * Reuses /api/ai-icp-assistant/prospect-search, the same endpoint (and so the
 * same scoring and reasoning) as the advanced-search page. A second search path
 * would drift from it and show leads the launch would never enrol.
 *
 * It is a SAMPLE, not the enrolment list. The real run pulls fresh results at
 * its own daily cadence, so the copy says "a sample" rather than implying these
 * exact people are queued.
 */

import React, { useState } from 'react';
import { Loader2, Sparkles, ExternalLink, Users } from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

export interface PreviewLead {
  id: string;
  name: string;
  headline?: string;
  location?: string;
  profile_url?: string;
  profile_picture?: string;
  icp_score?: number;
  icp_reasoning?: string;
}

/** Same thresholds the advanced-search list uses, so the colours agree. */
function scoreTone(score: number) {
  if (score >= 70) return { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  if (score >= 50) return { dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
  return { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

export default function LeadPreviewPanel({
  query,
  businessProfile,
  count = 6,
  disabledReason,
}: {
  /** Free-text targeting, built from the source node's fields. */
  query: string;
  businessProfile?: any;
  count?: number;
  /** When set, the button is disabled and this explains why. */
  disabledReason?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<PreviewLead[] | null>(null);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetchWithTenant('/api/ai-icp-assistant/prospect-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          icpProfile: businessProfile || undefined,
          sessionId: `preview-${Date.now()}`,
          seenIds: [],
          batchSize: count,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.success) throw new Error(d?.error || 'Could not run the search.');

      const rows: PreviewLead[] = (Array.isArray(d.results) ? d.results : [])
        .slice(0, count)
        .map((item: any, i: number) => ({
          id: item.id || `pv-${i}`,
          name: item.name || [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Unknown',
          headline: item.headline || item.title || '',
          location: item.location || '',
          profile_url: item.profile_url || '',
          profile_picture: item.profile_picture || '',
          icp_score: typeof item.icp_score === 'number' ? item.icp_score : undefined,
          icp_reasoning: item.icp_reasoning || '',
        }));

      setLeads(rows);
      // An empty result is a real answer, not an error - it usually means the
      // targeting is too narrow, and saying so is more useful than a spinner
      // that finishes with nothing visible.
      if (!rows.length) setError('No one matched. Try widening the job titles or the location.');
    } catch (err: any) {
      setError(err?.message || 'Could not run the search.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={busy || !!disabledReason}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-950/30 dark:text-blue-300"
      >
        {busy
          ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding people…</>)
          : (<><Users className="h-3.5 w-3.5" /> {leads ? 'Refresh sample' : 'Preview who gets contacted'}</>)}
      </button>

      {disabledReason && <p className="text-[11px] text-muted-foreground">{disabledReason}</p>}
      {error && <p className="text-[11px] text-amber-700 dark:text-amber-400">{error}</p>}

      {!!leads?.length && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            A sample of who matches today. The campaign pulls fresh results each day, so these
            exact people are not queued.
          </p>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
            {leads.map((l) => {
              const score = typeof l.icp_score === 'number' ? l.icp_score : null;
              const tone = scoreTone(score ?? 0);
              return (
                <div key={l.id} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-start gap-2">
                    {l.profile_picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.profile_picture} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                        {initials(l.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate">{l.name}</span>
                        {score !== null && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone.chip}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            {score}%
                          </span>
                        )}
                      </div>
                      {l.headline && <p className="text-[11px] text-muted-foreground truncate">{l.headline}</p>}
                      {l.location && <p className="text-[11px] text-muted-foreground">📍 {l.location}</p>}
                      {l.icp_reasoning && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground line-clamp-3">{l.icp_reasoning}</p>
                      )}
                      {l.profile_url && (
                        <a href={l.profile_url} target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1">
            <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
            Scores come from your ICP profile. Anything under 50% is a weak match - tighten the
            targeting on the source node if too many look wrong.
          </p>
        </div>
      )}
    </div>
  );
}
