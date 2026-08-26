'use client';
/**
 * MAGe — Media Generation Engine settings card.
 *
 * One surface for everything the media agent draws on:
 *
 *   Gallery       opens the same viewer the media chat uses
 *   Business DNA  list, set default, edit with the agent, extract, build without a URL
 *   ICP           what is on file, with create/edit handing off to the media chat
 *   Drive         Media_Gen + Work_Orders folders (BrandAssetsSettings)
 *   Keywords      shorthand that expands inside work-order filenames
 *
 * Served by the playground worker, not the Next.js API, so every call goes
 * direct with the JWT rather than through fetchWithTenant.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Images,
  Fingerprint,
  Target,
  FolderOpen,
  Type,
  Star,
  Trash2,
  Loader2,
  Plus,
  Globe,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  ChevronRight,
  Info,
  Eye,
} from 'lucide-react';
import { safeStorage } from '@lad/shared/storage';
import { BrandAssetsSettings } from './BrandAssetsSettings';
import { AgentBuilderGallery } from '@/components/voice-agent/playground/builder-steps/AgentBuilderGallery';
import {
  AgentBuilderBrandDNA,
  type BrandDnaData,
} from '@/components/voice-agent/playground/builder-steps/AgentBuilderBrandDNA';
import { MediaGenerationModal } from '@/components/voice-agent/MediaGenerationModal';

const WORKER_URL =
  process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || 'http://localhost:8080';

interface BrandProfile {
  domain: string;
  is_default: boolean;
  from_crawl: boolean;
  brand_name?: string | null;
  tagline?: string | null;
  asset_count: number;
}

interface IcpSummary {
  exists: boolean;
  source?: string;
  name?: string | null;
  description?: string | null;
  summary?: string;
}

interface ExtractionRun {
  run_id: string;
  status?: string;
  message?: string;
  progress?: number;
}

interface KeywordPreview {
  input: string;
  expanded: string;
  matched: string[];
}

/** What the card shows for a profile, plus the marker for a wizard-built one. */
type ViewedDna = BrandDnaData & { from_crawl?: boolean };

type Section = 'gallery' | 'dna' | 'icp' | 'drive' | 'keywords';

export const MageSettings: React.FC = () => {
  const [open, setOpen] = useState<Section | null>('dna');
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [defaultDomain, setDefaultDomain] = useState<string | null>(null);
  const [icp, setIcp] = useState<IcpSummary | null>(null);
  const [keywords, setKeywords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<React.ComponentProps<typeof AgentBuilderGallery>['images']>([]);
  const [galleryVideos, setGalleryVideos] = useState<React.ComponentProps<typeof AgentBuilderGallery>['videos']>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [showMediaChat, setShowMediaChat] = useState(false);

  const [extractUrl, setExtractUrl] = useState('');
  const [extractRun, setExtractRun] = useState<ExtractionRun | null>(null);
  // Cleared on unmount so a running poll loop stops instead of spending its
  // full 20-minute budget fetching for a component nobody is looking at.
  const mountedRef = useRef(true);
  const [changeTarget, setChangeTarget] = useState<string | null>(null);
  const [changeText, setChangeText] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [viewingDna, setViewingDna] = useState<ViewedDna | null>(null);
  const [dnaLoading, setDnaLoading] = useState<string>('');

  const [kwKey, setKwKey] = useState('');
  const [kwValue, setKwValue] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewResult, setPreviewResult] = useState<KeywordPreview | null>(null);

  const headers = useCallback((json = false): Record<string, string> => {
    const token = safeStorage.getItem('token');
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const readError = async (res: Response, fallback: string) => {
    try {
      const body = await res.json();
      return body?.detail || fallback;
    } catch {
      return fallback;
    }
  };

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/mage/overview`, { headers: headers() });
      if (!res.ok) throw new Error(await readError(res, 'Could not load MAGe settings.'));
      const data = await res.json();
      setProfiles(data?.brand_dna?.profiles || []);
      setDefaultDomain(data?.brand_dna?.default_domain || null);
      setIcp(data?.icp || null);
      setKeywords(data?.keywords?.mappings || {});
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load MAGe settings.');
      return null;
    }
  }, [headers]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOverview();
      setLoading(false);
    })();
  }, [loadOverview]);

  // Assigned in the body, not just the cleanup: StrictMode mounts, unmounts and
  // remounts, and a ref survives that — so a cleanup-only version would latch
  // false on the remount and stop every later poll from running.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── gallery ───────────────────────────────────────────────────────────────

  const openGallery = async (full = false) => {
    setShowGallery(true);
    setGalleryLoading(true);
    try {
      const qs = full ? 'max_age_days=' : 'max_age_days=90';
      const res = await fetch(`${WORKER_URL}/playground-media/gallery?${qs}`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data.images || []);
        setGalleryVideos(data.videos || []);
      }
    } catch {
      // Leave the viewer open and empty rather than closing under the user.
    } finally {
      setGalleryLoading(false);
    }
  };

  // ── brand DNA ─────────────────────────────────────────────────────────────

  const setDefault = async (domain: string | null) => {
    setBusy(`default:${domain}`);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/brand-dna/default`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not set the default.'));
      setNotice(domain ? `Default set to ${domain}.` : 'Default cleared.');
      await loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set the default.');
    } finally {
      setBusy('');
    }
  };

  const viewProfile = async (domain: string) => {
    setDnaLoading(domain);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/brand-dna/${encodeURIComponent(domain)}`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not load that profile.'));
      setViewingDna(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that profile.');
    } finally {
      setDnaLoading('');
    }
  };

  const deleteProfile = async (domain: string) => {
    if (!window.confirm(`Delete the "${domain}" Business DNA permanently?`)) return;
    setBusy(`delete:${domain}`);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/brand-dna/delete`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not delete the profile.'));
      setNotice(`Deleted ${domain}.`);
      await loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the profile.');
    } finally {
      setBusy('');
    }
  };

  const submitChanges = async () => {
    if (!changeTarget || !changeText.trim()) return;
    setBusy('changes');
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/brand-dna/changes`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ domain: changeTarget, request: changeText.trim() }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not apply the changes.'));
      setNotice(`Updated ${changeTarget}.`);
      setChangeText('');
      setChangeTarget(null);
      await loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply the changes.');
    } finally {
      setBusy('');
    }
  };

  const startExtraction = async () => {
    if (!extractUrl.trim()) return;
    setBusy('extract');
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/brand-dna/extract`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ url: extractUrl.trim() }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not start the extraction.'));
      const data = await res.json();
      setExtractRun({ ...data, status: 'running' });
      setExtractUrl('');
      pollExtraction(data.run_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the extraction.');
    } finally {
      setBusy('');
    }
  };

  const pollExtraction = useCallback(
    async (runId: string) => {
      // Crawls run for minutes. Poll rather than hold, and surface progress the
      // same way the media chat does so the wait is not a blank screen.
      for (let i = 0; i < 240; i += 1) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!mountedRef.current) return;
        try {
          const res = await fetch(`${WORKER_URL}/mage/brand-dna/extract/${runId}`, {
            headers: headers(),
          });
          if (!mountedRef.current) return;
          if (!res.ok) {
            // A rejected token or a run the worker has already evicted will not
            // start working on the next tick, and polling those to the end of
            // the budget leaves the user watching a spinner that never resolves.
            // Everything else (a 502, a cold start) is worth retrying.
            if ([401, 403, 404].includes(res.status)) {
              setExtractRun({
                run_id: runId,
                status: 'failed',
                message: await readError(res, 'Lost track of this extraction.'),
              });
              return;
            }
            continue;
          }
          const data = await res.json();
          setExtractRun({ run_id: runId, ...data });
          if (['completed', 'failed', 'error'].includes(String(data.status))) {
            await loadOverview();
            return;
          }
        } catch {
          // Transient — keep polling.
        }
      }
      // Ran out the budget without a terminal status. Say so rather than
      // leaving the card spinning forever.
      if (mountedRef.current) {
        setExtractRun({
          run_id: runId,
          status: 'failed',
          message: 'Still running after 20 minutes. Reopen this page to check on it.',
        });
      }
    },
    [headers, loadOverview],
  );

  // ── keywords ──────────────────────────────────────────────────────────────

  const saveKeyword = async () => {
    if (!kwKey.trim() || !kwValue.trim()) return;
    setBusy('keyword');
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/keywords`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ key: kwKey.trim(), value: kwValue.trim() }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not save the keyword.'));
      const data = await res.json();
      setKeywords(data.mappings || {});
      setKwKey('');
      setKwValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the keyword.');
    } finally {
      setBusy('');
    }
  };

  const deleteKeyword = async (key: string) => {
    setBusy(`kw:${key}`);
    try {
      const res = await fetch(`${WORKER_URL}/mage/keywords/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) setKeywords((await res.json()).mappings || {});
    } catch {
      setError('Could not delete the keyword.');
    } finally {
      setBusy('');
    }
  };

  const runPreview = async () => {
    if (!previewText.trim()) return;
    try {
      const res = await fetch(`${WORKER_URL}/mage/keywords/preview`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ text: previewText }),
      });
      if (res.ok) setPreviewResult(await res.json());
    } catch {
      setPreviewResult(null);
    }
  };

  // ── render helpers ────────────────────────────────────────────────────────

  const SectionHeader = ({
    id,
    icon,
    title,
    subtitle,
  }: {
    id: Section;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
  }) => (
    <button
      onClick={() => setOpen(open === id ? null : id)}
      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors"
    >
      <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
          {subtitle}
        </span>
      </span>
      <ChevronRight
        className={`w-4 h-4 text-gray-400 transition-transform ${open === id ? 'rotate-90' : ''}`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading MAGe settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── heading ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Media Generation Engine
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
          Everything the media agent works from — your brand profile, your reference
          imagery, and the shorthand it understands.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-xs">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* ── gallery: a button, not a section ── */}
      <button
        onClick={() => openGallery(false)}
        className="w-full flex items-center gap-3 px-5 py-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#060b21] hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors text-left"
      >
        <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Images className="w-4 h-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            Open gallery
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Everything generated for this workspace
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#060b21] divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden">
        {/* ── Business DNA ── */}
        <div>
          <SectionHeader
            id="dna"
            icon={<Fingerprint className="w-4 h-4" />}
            title="Business DNA"
            subtitle={
              defaultDomain
                ? `${profiles.length} profile${profiles.length === 1 ? '' : 's'} · using ${defaultDomain}`
                : `${profiles.length} profile${profiles.length === 1 ? '' : 's'} · no default set`
            }
          />
          {open === 'dna' && (
            <div className="px-5 pb-5 space-y-4">
              {!defaultDomain && profiles.length > 1 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 text-xs">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    You have {profiles.length} profiles and none set as default. Media
                    generation will not guess between them — it runs with no brand at all
                    until you pick one.
                  </span>
                </div>
              )}

              <ul className="space-y-2">
                {profiles.map((p) => (
                  <li
                    key={p.domain}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a1027]"
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {p.brand_name || p.domain}
                          </span>
                          {p.is_default && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-[10px] font-semibold">
                              <Star className="w-3 h-3" />
                              DEFAULT
                            </span>
                          )}
                          {!p.from_crawl && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-[10px] font-semibold">
                              NO WEBSITE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {p.domain} · {p.asset_count} image asset
                          {p.asset_count === 1 ? '' : 's'}
                        </div>
                        {!p.from_crawl && p.asset_count === 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Built from what you described, so it has no imagery yet. Add
                            your logo and product shots in the Drive section below, or
                            upload them there directly.
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!p.is_default && (
                          <button
                            onClick={() => setDefault(p.domain)}
                            disabled={busy === `default:${p.domain}`}
                            className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-60"
                          >
                            {busy === `default:${p.domain}` ? '…' : 'Use this'}
                          </button>
                        )}
                        <button
                          onClick={() => viewProfile(p.domain)}
                          disabled={dnaLoading === p.domain}
                          aria-label={`View ${p.domain}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-900 disabled:opacity-60"
                        >
                          {dnaLoading === p.domain ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setChangeTarget(p.domain);
                            setChangeText('');
                          }}
                          aria-label={`Edit ${p.domain}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-900"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProfile(p.domain)}
                          disabled={busy === `delete:${p.domain}`}
                          aria-label={`Delete ${p.domain}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
                        >
                          {busy === `delete:${p.domain}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {changeTarget === p.domain && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                          What should change?
                        </label>
                        <textarea
                          value={changeText}
                          onChange={(e) => setChangeText(e.target.value)}
                          rows={3}
                          placeholder="e.g. the accent colour should be teal, not orange, and the tone is too formal"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#060b21] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={submitChanges}
                            disabled={busy === 'changes' || !changeText.trim()}
                            className="px-3 py-1.5 text-xs rounded-md bg-[#0B1957] hover:bg-[#152a7a] text-white disabled:opacity-60"
                          >
                            {busy === 'changes' ? 'Applying…' : 'Apply changes'}
                          </button>
                          <button
                            onClick={() => setChangeTarget(null)}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {profiles.length === 0 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400 py-3">
                    No Business DNA yet. Analyse your website, or describe your brand
                    instead.
                  </li>
                )}
              </ul>

              {/* extract new */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Analyse a website
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={extractUrl}
                    onChange={(e) => setExtractUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm"
                  />
                  <button
                    onClick={startExtraction}
                    disabled={busy === 'extract' || !extractUrl.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#0B1957] hover:bg-[#152a7a] text-white disabled:opacity-60"
                  >
                    <Globe className="w-4 h-4" />
                    {busy === 'extract' ? 'Starting…' : 'Analyse'}
                  </button>
                  <button
                    onClick={() => setShowWizard(!showWizard)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <Wand2 className="w-4 h-4" />
                    No website
                  </button>
                </div>

                {extractRun && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0a1027] border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                      {['completed', 'failed', 'error'].includes(String(extractRun.status)) ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      )}
                      <span className="font-medium">{extractRun.status}</span>
                      {extractRun.message && <span>· {extractRun.message}</span>}
                    </div>
                    {typeof extractRun.progress === 'number' && (
                      <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{ width: `${Math.min(100, extractRun.progress)}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {showWizard && (
                  <MageWizard
                    workerUrl={WORKER_URL}
                    headers={headers}
                    onDone={async (msg) => {
                      setShowWizard(false);
                      setNotice(msg);
                      await loadOverview();
                    }}
                    onError={setError}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── ICP ── */}
        <div>
          <SectionHeader
            id="icp"
            icon={<Target className="w-4 h-4" />}
            title="ICP profile"
            subtitle={icp?.exists ? icp?.name || 'On file' : 'Not set up yet'}
          />
          {open === 'icp' && (
            <div className="px-5 pb-5 space-y-3">
              {icp?.exists ? (
                <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans bg-gray-50 dark:bg-[#0a1027] rounded-lg p-3 border border-gray-200 dark:border-gray-800 max-h-56 overflow-y-auto">
                  {icp.summary || 'No detail recorded.'}
                </pre>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No ICP profile yet. Media generation will still work, but without it the
                  agent has no audience or positioning to write toward.
                </p>
              )}
              <button
                onClick={() => setShowMediaChat(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#0B1957] hover:bg-[#152a7a] text-white"
              >
                <Pencil className="w-4 h-4" />
                {icp?.exists ? 'Edit ICP profile' : 'Create ICP profile'}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Opens the media chat, where the assistant walks through it with you.
              </p>
            </div>
          )}
        </div>

        {/* ── Drive ── */}
        <div>
          <SectionHeader
            id="drive"
            icon={<FolderOpen className="w-4 h-4" />}
            title="Drive folders"
            subtitle="Reference imagery and automated work orders"
          />
          {open === 'drive' && (
            <div className="px-5 pb-5">
              <BrandAssetsSettings />
            </div>
          )}
        </div>

        {/* ── Keywords ── */}
        <div>
          <SectionHeader
            id="keywords"
            icon={<Type className="w-4 h-4" />}
            title="Keywords"
            subtitle={`${Object.keys(keywords).length} shorthand${
              Object.keys(keywords).length === 1 ? '' : 's'
            } for work-order filenames`}
          />
          {open === 'keywords' && (
            <div className="px-5 pb-5 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Name a file in your Work_Orders folder with a keyword and the agent
                receives the full text it stands for. Useful because a filename is a poor
                place to write a brief.
              </p>

              {Object.keys(keywords).length > 0 && (
                <ul className="space-y-2">
                  {Object.entries(keywords).map(([key, value]) => (
                    <li
                      key={key}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a1027]"
                    >
                      <div className="flex items-start gap-3">
                        <code className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-mono shrink-0">
                          {key}
                        </code>
                        <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 break-words">
                          {value}
                        </span>
                        <button
                          onClick={() => deleteKeyword(key)}
                          disabled={busy === `kw:${key}`}
                          aria-label={`Delete ${key}`}
                          className="p-1 rounded text-gray-400 hover:text-red-600 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2">
                <input
                  value={kwKey}
                  onChange={(e) => setKwKey(e.target.value)}
                  placeholder="launch-poster"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm font-mono"
                />
                <textarea
                  value={kwValue}
                  onChange={(e) => setKwValue(e.target.value)}
                  rows={2}
                  placeholder="A launch announcement poster, product hero centred, logo top-left…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm"
                />
                <button
                  onClick={saveKeyword}
                  disabled={busy === 'keyword' || !kwKey.trim() || !kwValue.trim()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-[#0B1957] hover:bg-[#152a7a] text-white disabled:opacity-60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {busy === 'keyword' ? 'Saving…' : 'Add keyword'}
                </button>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Try a filename
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="launch-poster for the spring range"
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm"
                  />
                  <button
                    onClick={runPreview}
                    disabled={!previewText.trim()}
                    className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-60"
                  >
                    Preview
                  </button>
                </div>
                {previewResult && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-[#0a1027] border border-gray-200 dark:border-gray-800">
                    <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                      {previewResult.matched?.length
                        ? `Expanded ${previewResult.matched.join(', ')}`
                        : 'No keywords matched — used as written'}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                      {previewResult.expanded}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── gallery viewer, same component the media chat uses ── */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <AgentBuilderGallery
            images={galleryImages}
            videos={galleryVideos}
            loading={galleryLoading}
            onBack={() => setShowGallery(false)}
            onClose={() => setShowGallery(false)}
            isFullHistory={false}
            onLoadFullHistory={() => openGallery(true)}
          />
        </div>
      )}

      {viewingDna && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <AgentBuilderBrandDNA
            brandDna={viewingDna}
            onClose={() => setViewingDna(null)}
            onBack={() => setViewingDna(null)}
            onNext={() => setViewingDna(null)}
            hideButtons
            phase={viewingDna.from_crawl ? 'Business DNA' : 'Business DNA · described, not crawled'}
          />
        </div>
      )}

      {showMediaChat && <MediaGenerationModal isOpen onClose={() => setShowMediaChat(false)} />}
    </div>
  );
};

/**
 * Build a Business DNA without a website.
 *
 * Paste text, upload documents, or answer questions — they combine, and the
 * interview only asks for what the material did not already cover.
 */
const MageWizard: React.FC<{
  workerUrl: string;
  headers: (json?: boolean) => Record<string, string>;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}> = ({ workerUrl, headers, onDone, onError }) => {
  const [pasted, setPasted] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [corpus, setCorpus] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState<{ field: string; question: string } | null>(null);
  const [reply, setReply] = useState('');
  const [phase, setPhase] = useState<'input' | 'interview' | 'building'>('input');
  const [working, setWorking] = useState(false);

  const advance = async (nextCorpus: string, nextAnswers: Record<string, string>) => {
    setWorking(true);
    try {
      const res = await fetch(`${workerUrl}/mage/wizard/question`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ corpus: nextCorpus, answers: nextAnswers }),
      });
      const data = await res.json();
      if (data.done) {
        await build(nextCorpus, nextAnswers);
      } else {
        setQuestion({ field: data.field, question: data.question });
        setPhase('interview');
      }
    } catch {
      onError('The wizard could not continue.');
    } finally {
      setWorking(false);
    }
  };

  const build = async (finalCorpus: string, finalAnswers: Record<string, string>) => {
    setPhase('building');
    setWorking(true);
    try {
      const res = await fetch(`${workerUrl}/mage/wizard/build`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({
          corpus: finalCorpus,
          answers: finalAnswers,
          brand_name: finalAnswers.brand_name || '',
        }),
      });
      if (!res.ok) throw new Error('build failed');
      const data = await res.json();
      onDone(`Created "${data.brand_name}". ${data.next_step}`);
    } catch {
      onError('Could not build the Business DNA.');
      setPhase('input');
    } finally {
      setWorking(false);
    }
  };

  const startFromMaterial = async () => {
    setWorking(true);
    try {
      const form = new FormData();
      form.append('pasted_text', pasted);
      files.forEach((f) => form.append('files', f));
      const res = await fetch(`${workerUrl}/mage/wizard/read`, {
        method: 'POST',
        headers: headers(),
        body: form,
      });
      const data = await res.json();
      setCorpus(data.corpus || '');
      await advance(data.corpus || '', answers);
    } catch {
      onError('Could not read the material you supplied.');
      setWorking(false);
    }
  };

  return (
    <div className="mt-3 p-4 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Describe your brand instead
        </span>
      </div>

      {phase === 'input' && (
        <>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Paste anything you already have — brand guidelines, an About page, positioning
            notes — or upload a document. If you have nothing written down, skip straight to
            the questions.
          </p>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder="Paste your brand guidelines or anything describing the business…"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm"
          />
          <input
            type="file"
            multiple
            accept=".pdf,.md,.txt,.docx"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="block w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-white dark:file:bg-gray-900 file:text-gray-700 dark:file:text-gray-200"
          />
          {files.length > 0 && (
            <p className="text-xs text-gray-500">
              {files.length} file{files.length === 1 ? '' : 's'} ready · PDF, DOCX, MD, TXT
            </p>
          )}
          <button
            onClick={startFromMaterial}
            disabled={working}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#0B1957] hover:bg-[#152a7a] text-white disabled:opacity-60"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {working ? 'Reading…' : pasted.trim() || files.length ? 'Continue' : 'Just ask me questions'}
          </button>
        </>
      )}

      {phase === 'interview' && question && (
        <>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
            {question.question}
          </p>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm"
          />
          <button
            onClick={async () => {
              const next = { ...answers, [question.field]: reply.trim() };
              setAnswers(next);
              setReply('');
              await advance(corpus, next);
            }}
            disabled={working || !reply.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#0B1957] hover:bg-[#152a7a] text-white disabled:opacity-60"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {working ? 'Thinking…' : 'Next'}
          </button>
        </>
      )}

      {phase === 'building' && (
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Writing your Business DNA…
        </div>
      )}
    </div>
  );
};
