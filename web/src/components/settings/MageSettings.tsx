'use client';
/**
 * MAGe, the media generation settings card.
 *
 * Organised around the two questions a customer actually has: what does the
 * agent know about my brand, and what have I asked it to make. Tiles preview
 * their own content so each one explains itself; the depth sits behind a Manage
 * modal rather than stacked down the page.
 *
 *   Requests          the job queue, the only thing here you DO
 *   Brand profile     name, tagline, palette; list/add/view/edit/delete in the modal
 *   Audience          the ICP profile the agent writes for
 *   Reference images  logos and photos it can borrow from
 *   Gallery           everything it has produced
 *   Shortcuts         short words that expand into a longer brief
 *   Google Drive      the shared folders, as an alternative way in
 *
 * Deliberately loads no images. Every tile renders from counts and metadata that
 * /mage/overview already returns, so opening this card costs one request and no
 * asset traffic.
 *
 * Served by the playground worker, not the Next.js API, so every call goes
 * direct with the JWT rather than through fetchWithTenant.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Star,
  Trash2,
  Loader2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Eye,
  Play,
  RefreshCw,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import {
  IconBrandGoogleDrive,
  IconClipboardList,
  IconFingerprint,
  IconPhoto,
  IconSparkles,
  IconTypography,
  IconUsersGroup,
} from '@tabler/icons-react';
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

/**
 * What to show for a profile: its website address, or the folder name when the
 * backend has never recorded one. Never the raw folder when we have better.
 */
function label(p: { display_domain?: string | null; domain: string }): string {
  return p.display_domain || p.domain;
}

interface BrandProfile {
  /** The storage folder name. An internal key: never show this to a customer. */
  domain: string;
  /**
   * The website address, for display. Folder names replace every punctuation
   * mark with an underscore and cannot be turned back, so the backend keeps the
   * real address alongside. Falls back to the folder name when we never had one.
   */
  display_domain?: string | null;
  is_default: boolean;
  from_crawl: boolean;
  brand_name?: string | null;
  tagline?: string | null;
  asset_count: number;
  /** When it was extracted, from the index file. Absent until MAGe indexes it. */
  extracted_at?: string | null;
  /** False for a profile the extractor has not yet written a row for. */
  indexed?: boolean;
  /**
   * Swatches for the tile, and ONLY populated for the default profile. Every
   * other row would need its whole profile opened to fill this in, which is what
   * made loading the card read every profile the tenant has.
   */
  colors?: { primary?: string; background?: string; accent?: string } | null;
}

/** Reference image counts, from /mage/overview. Counts only, never the images. */
interface AssetSummary {
  total: number;
  active: number;
  categories: Array<{ name: string; count: number }>;
  last_synced?: string | null;
}

/** Work order counts for the status strip, from /mage/overview. */
interface QueueSummary {
  queued: number;
  processing: number;
  completed: number;
  closed: number;
  total: number;
  last_synced?: string | null;
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


/** One row in the work order list, as `GET /auto-media/jobs` returns it. */
interface WorkOrderJob {
  group_id: string;
  source: 'drive' | 'gcs';
  status: string;
  filename: string;
  instruction: string;
  description: string;
  attempts: number;
  error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  image_count: number;
}

interface WorkOrderJobs {
  active_run: boolean;
  last_synced?: string | null;
  counts: { queued: number; processing: number; completed: number; closed: number };
  queued: WorkOrderJob[];
  processing: WorkOrderJob[];
  completed: WorkOrderJob[];
  closed: WorkOrderJob[];
}

/** Which Manage modal is open, if any. */
type ModalId = 'request' | 'brand' | 'audience' | 'assets' | 'shortcuts' | 'drive';

/**
 * Shared width for the card's two headline actions, Run agent and New request.
 *
 * They sit in different containers, so without a common floor they end up a few
 * pixels apart, which reads as a mistake rather than as two equal actions.
 */
const ACTION_WIDTH = 'clamp(7rem, 8.6vw, 8.75rem)';

/**
 * A placeholder shaped like the value it stands in for.
 *
 * The card used to sit behind a single "Loading MAGe settings" spinner until
 * every section had arrived. The layout is known before any of the data is, so
 * it is drawn immediately and each value fills in as its section lands.
 */
const Bar: React.FC<{ w: string; h?: string; className?: string }> = ({
  w, h = '0.75rem', className = '',
}) => (
  <span
    aria-hidden="true"
    className={`block rounded bg-gray-200 dark:bg-gray-700/60 animate-pulse ${className}`}
    style={{ width: w, height: h }}
  />
);

/** Two stacked lines, the shape most tile bodies take. */
const TextSkeleton: React.FC = () => (
  <>
    <Bar w="62%" h="0.85rem" className="mb-1.5" />
    <Bar w="88%" />
  </>
);

/**
 * Turn the extractor's internal commentary into something a customer can read.
 *
 * The status endpoint returns MAGe's own progress notes, written for a log:
 * "Initializing Playwright scraper", "Launching headless browser context". On
 * failure `message` carries the raw exception, stack trace and all, and that was
 * being printed straight onto the settings page. A missing API key read as a
 * Python traceback.
 *
 * Matched on substrings rather than exact text because these strings are written
 * for humans reading logs, not as a stable contract, and they change freely.
 * Anything unrecognised falls back to a neutral line rather than leaking.
 */
// Order matters: first match wins. "Brand DNA synthesized successfully" contains
// both a synthesis word and a success word, so the terminal patterns sit first.
const EXTRACTION_STAGES: Array<[RegExp, string]> = [
  // Our own line, set while the profile list is being refreshed after the
  // extractor reports done. Sits first so it is never shadowed.
  [/adding it to your profiles/i,         'Adding it to your profiles'],
  [/complet|success|synthesized/i,        'Finished'],
  [/queuing|queue/i,                      'Queued'],
  [/playwright|browser|headless/i,        'Opening your website'],
  [/screenshot/i,                         'Capturing screenshots'],
  [/download/i,                           'Collecting images'],
  [/scrap|crawl|dom|asset candidates/i,   'Reading the page'],
  [/synthes|gemini|brand dna|visual parser/i, 'Building your brand profile'],
  [/upload|gcs|storage/i,                 'Saving'],
];

export function extractionLabel(message?: string, status?: string): string {
  if (status === 'completed') return 'Finished';
  if (status === 'failed' || status === 'error') return 'Could not finish';
  for (const [pattern, label] of EXTRACTION_STAGES) {
    if (message && pattern.test(message)) return label;
  }
  return 'Working on it';
}

/**
 * A short, actionable reason for a failed extraction.
 *
 * Never the raw error. Customers cannot act on a traceback, and it exposes how
 * the service is built. Anything we do not recognise becomes a generic line;
 * the real error is still in the worker logs where it belongs.
 */
export function extractionFailureReason(message?: string): string {
  const m = message || '';
  if (/api.?key|GEMINI_API_KEY|GOOGLE_API_KEY/i.test(m)) {
    return 'Media generation is not configured on this environment. Contact support.';
  }
  if (/timeout|timed out/i.test(m)) {
    return 'That site took too long to respond. Try again, or check the address.';
  }
  if (/dns|name resolution|could not resolve|connection|unreachable/i.test(m)) {
    return 'We could not reach that address. Check the URL and try again.';
  }
  if (/403|401|forbidden|unauthor/i.test(m)) {
    return 'That site blocked us from reading it.';
  }
  if (/404|not found/i.test(m)) {
    return 'That page does not exist. Check the address.';
  }
  return 'Something went wrong reading that site. Try again, or use "No website" instead.';
}

// ── render helpers, at module scope ─────────────────────────────────────────
//
// Declared OUTSIDE the component on purpose. A component defined inside a
// render body is a brand new type on every render, so React unmounts and
// remounts its whole subtree each time state changes. In a modal that means
// every input loses focus after a single keystroke.

/** Palette names resolve here so a shortcut colour stays legible in both themes. */
const SWATCH: Record<string, string> = {
  coral: '#D85A30', teal: '#1D9E75', purple: '#7F77DD', blue: '#378ADD',
  green: '#639922', amber: '#BA7517', pink: '#D4537E', gray: '#888780',
};
const CATEGORY_TINTS = ['#7F77DD', '#1D9E75', '#D85A30', '#378ADD', '#639922', '#D4537E'];

const relative = (iso?: string | null): string => {
  if (!iso) return 'never';
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(secs) || secs < 0) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};


/**
 * One tile. Kept small on purpose: the tile previews, the modal edits.
 *
 * Everything is sized against the viewport rather than in fixed pixels, so the
 * ratio between icon, heading and body holds at any width. clamp() rather than
 * raw vw: raw viewport units go unreadable on a narrow window and oversized on
 * a large monitor, and this card lives in a panel whose width we do not own.
 * The icon is sized from the wrapper so call sites stay plain.
 */
const Tile: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  span?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, hint, action, span, children }) => (
  <div
    className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 flex flex-col ${
      span ? 'sm:col-span-2 lg:col-span-3' : ''
    }`}
    style={{
      padding: 'clamp(0.85rem, 1.1vw, 1.25rem)',
      // A floor on the six small tiles so the last line of body text is not
      // sitting flush on top of the Manage button. Without it a tile with one
      // short line and a tile with three collapse to different heights, and
      // the short one leaves no breathing room at all.
      minHeight: span ? undefined : 'clamp(11rem, 13vw, 13.5rem)',
    }}
  >
    <div
      className="flex items-center"
      style={{ gap: 'clamp(0.4rem, 0.6vw, 0.6rem)', marginBottom: 'clamp(0.6rem, 0.8vw, 0.9rem)' }}
    >
      <span
        className="text-gray-500 dark:text-gray-400 shrink-0 [&>svg]:w-[1.45em] [&>svg]:h-[1.45em]"
        style={{ fontSize: 'clamp(0.95rem, 1.05vw, 1.15rem)' }}
        title={hint}
      >
        {icon}
      </span>
      <span
        className="font-semibold text-gray-900 dark:text-gray-100 truncate"
        style={{ fontSize: 'clamp(0.85rem, 0.95vw, 1rem)' }}
      >
        {title}
      </span>
      {action && <span className="ml-auto shrink-0">{action}</span>}
    </div>
    <div className="flex-1 flex flex-col">{children}</div>
  </div>
);

/**
 * Wrapped rather than bare: `margin-top: auto` pins the button to the bottom of
 * the tile, but when the body text is long enough to fill the tile that auto
 * margin collapses to nothing and the last line sits flush on the button. The
 * wrapper carries the push AND a padding floor, so the gap survives either way.
 */
const ManageButton: React.FC<{ onClick: () => void; label?: string; hint: string }> = ({
  onClick, label = 'Manage', hint,
}) => (
  <div style={{ marginTop: 'auto', paddingTop: 'clamp(0.85rem, 1.2vw, 1.15rem)' }}>
    <button
      onClick={onClick}
      title={hint}
      className="font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      style={{
        fontSize: 'clamp(0.72rem, 0.8vw, 0.82rem)',
        padding: 'clamp(0.3rem, 0.45vw, 0.42rem) clamp(0.6rem, 0.8vw, 0.85rem)',
      }}
    >
      {label}
    </button>
  </div>
);

/** Shared modal shell. */
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl my-8 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <button
          onClick={onClose}
          title="Close"
          className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </div>
);

export const MageSettings: React.FC = () => {
  const [modal, setModal] = useState<ModalId | null>(null);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [icp, setIcp] = useState<IcpSummary | null>(null);
  const [keywords, setKeywords] = useState<Record<string, string>>({});
  // token to palette name, so a shortcut keeps its dot colour across a reload.
  const [keywordColors, setKeywordColors] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<AssetSummary | null>(null);
  const [queue, setQueue] = useState<QueueSummary | null>(null);
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
  // The address to put in the change box heading. changeTarget stays the folder
  // name because that is what the endpoint keys on.
  const changeTargetLabel = profiles.find((p) => p.domain === changeTarget);
  const [changeText, setChangeText] = useState('');
  // The change box renders below the profile list, so with a dozen profiles it
  // opens off screen and the pencil looks like it did nothing.
  const changeBoxRef = useRef<HTMLTextAreaElement>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [viewingDna, setViewingDna] = useState<ViewedDna | null>(null);
  const [dnaLoading, setDnaLoading] = useState<string>('');

  const [jobs, setJobs] = useState<WorkOrderJobs | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInstruction, setUploadInstruction] = useState('');
  const [uploadRunNow, setUploadRunNow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kwKey, setKwKey] = useState('');
  const [kwValue, setKwValue] = useState('');
  const [kwColor, setKwColor] = useState('teal');
  // Which shortcut the form is currently editing, if any. The same form does
  // both jobs because the write is an upsert: saving an existing token updates
  // it rather than creating a duplicate.
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null);
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
      setIcp(data?.icp || null);
      setKeywords(data?.keywords?.mappings || {});
      setKeywordColors(data?.keywords?.colors || {});
      setAssets(data?.assets || null);
      setQueue(data?.queue || null);
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

  // ?panel=assets opens the Reference images panel on arrival.
  //
  // The brand DNA view tells a customer whose logo could not be extracted to
  // add one to the Drive folder, and that view also renders inside the guided
  // journey, where there is no panel to open. From there the link comes here,
  // and this is what makes it land on the right panel rather than the top of
  // the page. Read off window rather than useSearchParams so the component does
  // not need a Suspense boundary of its own.
  useEffect(() => {
    const panel = new URLSearchParams(window.location.search).get('panel');
    if (panel === 'assets') setModal('assets');
  }, []);

  // Assigned in the body, not just the cleanup: StrictMode mounts, unmounts and
  // remounts, and a ref survives that, so a cleanup-only version would latch
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
      setNotice(`Updated ${changeTargetLabel ? label(changeTargetLabel) : changeTarget}.`);
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
      // The address deliberately stays in the field, held rather than cleared,
      // so it is obvious which site is being analysed while it runs.
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
          const terminal = ['completed', 'failed', 'error'].includes(String(data.status));

          if (!terminal) {
            setExtractRun({ run_id: runId, ...data });
            continue;
          }

          // Refresh the list BEFORE announcing the run is finished.
          //
          // The status came from local state and appeared instantly, while the
          // list waited on a request taking several seconds, so "Finished" showed
          // up and the new profile did not arrive until noticeably later. Saying
          // it is done while it is visibly not is worse than taking a moment
          // longer to say it, so the run stays "working" until the list agrees.
          setExtractRun({
            run_id: runId,
            ...data,
            status: 'running',
            message: 'Adding it to your profiles',
          });
          await loadOverview();

          setExtractRun({ run_id: runId, ...data });
          // Free the field for the next site. A failure keeps the address, since
          // the usual next move is to correct it and try again.
          if (data.status === 'completed') setExtractUrl('');
          return;
        } catch {
          // Transient, so keep polling.
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

  // ── work orders ───────────────────────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/auto-media/jobs`, { headers: headers() });
      if (!res.ok) throw new Error(await readError(res, 'Could not load work orders.'));
      setJobs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load work orders.');
    } finally {
      setJobsLoading(false);
    }
  }, [headers]);

  // The Requests tile is always visible now, so its rows load with the card.
  // /mage/overview already carries the counts; this fills in the row detail.
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Bring the change box into view and put the cursor in it when a profile's
  // pencil is clicked. It sits below the whole profile list, so on a tenant with
  // a dozen profiles it opens out of sight and the click reads as doing nothing.
  //
  // Runs after the render that mounts the box, so the ref is attached by now.
  useEffect(() => {
    if (!changeTarget) return;
    const box = changeBoxRef.current;
    if (!box) return;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus after the scroll starts rather than before: focusing first makes the
    // browser jump to the element instantly, which undoes the smooth scroll.
    const t = window.setTimeout(() => box.focus({ preventScroll: true }), 120);
    return () => window.clearTimeout(t);
  }, [changeTarget]);

  /**
   * Start a run and deliberately ignore what comes back.
   *
   * The open request IS the hold that keeps the Cloud Run instance alive for the
   * length of the run, so this must NOT be aborted. Closing it early can get the
   * instance reclaimed mid-job, stranding that job at 🟡 until its claim TTL
   * expires. We simply do not await the body; results are viewed in the Gallery.
   */
  const triggerRun = async () => {
    if (jobs?.active_run) {
      setNotice('A run is already in flight. Wait for it to finish.');
      return;
    }
    setBusy('run');
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/auto-media/run`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ return_type: 'url' }),
      });
      if (res.status === 409) {
        setNotice(await readError(res, 'A run is already in flight.'));
      } else if (!res.ok) {
        setError(await readError(res, 'Could not start the run.'));
      } else {
        setNotice('Run started. Generated images appear in the Gallery when it finishes.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the run.');
    } finally {
      setBusy('');
      loadJobs();
    }
  };

  const cancelJob = async (groupId: string) => {
    setBusy(`cancel:${groupId}`);
    setError('');
    try {
      const res = await fetch(
        `${WORKER_URL}/auto-media/jobs/${encodeURIComponent(groupId)}/cancel`,
        { method: 'POST', headers: headers(true) },
      );
      if (!res.ok) throw new Error(await readError(res, 'Could not cancel that job.'));
      setNotice('Job cancelled. Your file is untouched, only the queue changed.');
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel that job.');
    } finally {
      setBusy('');
    }
  };

  /**
   * Upload straight to our storage, skipping Drive.
   *
   * The service account cannot write to Drive at all, having no storage quota,
   * so an upload from here lands in GCS and will not appear in the customer's
   * Drive folder. It is queued and processed identically either way.
   */
  const uploadWorkOrder = async () => {
    if (!uploadFile) return;
    setBusy('upload');
    setError('');
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('instruction', uploadInstruction);
      form.append('run_now', String(uploadRunNow));
      form.append('return_type', 'url');

      const token = safeStorage.getItem('token');
      const res = await fetch(`${WORKER_URL}/auto-media/upload`, {
        method: 'POST',
        // No Content-Type: the browser must set the multipart boundary itself.
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not upload that file.'));

      setNotice(
        uploadRunNow
          ? 'Uploaded and generated. Open the Gallery to see the results.'
          : 'Uploaded and queued. The next run will pick it up.',
      );
      setUploadFile(null);
      setUploadInstruction('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that file.');
    } finally {
      setBusy('');
    }
  };

  // ── keywords ──────────────────────────────────────────────────────────────

  const clearKeywordForm = () => {
    setEditingKeyword(null);
    setKwKey('');
    setKwValue('');
    setKwColor('teal');
  };

  /** Load an existing shortcut into the form so it can be changed in place. */
  const startEditKeyword = (token: string, value: string) => {
    setEditingKeyword(token);
    setKwKey(token);
    setKwValue(value);
    setKwColor(keywordColors[token] || 'teal');
  };

  const saveKeyword = async () => {
    if (!kwKey.trim() || !kwValue.trim()) return;
    const token = kwKey.trim();
    setBusy('keyword');
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/mage/keywords`, {
        method: 'POST',
        headers: headers(true),
        // color is a palette name, not a hex, so it resolves per theme.
        // The endpoint upserts, so this same call both adds and edits.
        body: JSON.stringify({ key: token, value: kwValue.trim(), color: kwColor }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not save the keyword.'));
      const data = await res.json();
      setKeywords(data.mappings || {});
      setKeywordColors((prev) => ({ ...prev, [token]: kwColor }));
      setNotice(editingKeyword ? `Updated ${token}.` : `Added ${token}.`);
      clearKeywordForm();
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
      // Deleting the one currently loaded in the form would otherwise leave it
      // sitting there in edit mode, saving back a shortcut just removed.
      if (editingKeyword === key) clearKeywordForm();
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

  const defaultProfile = profiles.find((p) => p.is_default) || null;
  const brandColors = defaultProfile?.colors || null;

  // A run is in flight from the moment it is triggered until the status turns
  // terminal, not just while the trigger request is open. The trigger returns a
  // run id in under a second while the work continues for minutes, so keying off
  // `busy` alone would re-enable the field almost immediately.
  const extractionRunning =
    busy === 'extract' ||
    (!!extractRun && !['completed', 'failed', 'error'].includes(String(extractRun.status)));

  /**
   * One readable line for the Audience tile.
   *
   * The stored summary is a run-on of "Company: x Industry: y What they do: z",
   * which is fine for a prompt and unreadable on a tile. Prefer the two fields a
   * person would actually recognise their own audience by.
   */
  const icpHighlight = (() => {
    const raw = icp?.summary || icp?.description || '';
    if (!raw) return '';
    const pick = (label: string) => {
      const m = raw.match(new RegExp(`${label}\s*:\s*([^:]+?)(?=\s+[A-Z][a-z]+(?:\s[a-z]+)*\s*:|$)`));
      return m ? m[1].trim().replace(/\s+/g, ' ') : '';
    };
    const industry = pick('Industry');
    const where = pick('Geographic focus') || pick('Locations');
    const line = [industry, where].filter(Boolean).join(' · ');
    return line || raw.slice(0, 90);
  })();

  // No full-card spinner. The layout is known before any of the data is, so the
  // card is drawn straight away and each tile fills in as its section lands.

  const queued = queue?.queued ?? 0;
  // Each section arrives on its own, so each tile knows independently whether it
  // is still waiting rather than the whole card sharing one flag.
  const brandPending = loading && !defaultProfile;
  const icpPending = loading && !icp;
  const assetsPending = loading && !assets;
  const keywordsPending = loading && !Object.keys(keywords).length;

  return (
    <div
      className="mx-auto"
      style={{
        // The card sits in a panel we do not control the width of. Capping it
        // keeps tile density right on a wide monitor instead of stretching six
        // small tiles across 1300px, which is what made this look sparse.
        maxWidth: 'min(100%, 78rem)',
        padding: 'clamp(0.75rem, 1.6vw, 1.75rem)',
        // Breathing room under the grid so the last row of tiles is not flush
        // against whatever follows. vh rather than a percentage: percentage
        // padding resolves against the container's WIDTH, which on a wide panel
        // would put an enormous gap here.
        paddingBottom: '10vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(0.7rem, 1vw, 1.1rem)',
      }}
    >
      <div>
        <h2
          className="font-semibold text-gray-900 dark:text-gray-100"
          style={{ fontSize: 'clamp(1rem, 1.15vw, 1.2rem)' }}
        >
          Media generation
        </h2>
        <p
          className="text-gray-500 dark:text-gray-400"
          style={{ fontSize: 'clamp(0.8rem, 0.88vw, 0.92rem)' }}
        >
          What the agent knows about your brand, and what you have asked it to make.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} title="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')} title="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* status strip */}
      <div className="flex items-center gap-4 flex-wrap rounded-lg bg-gray-50 dark:bg-gray-900/60 px-4 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          title={
            queue?.last_synced
              ? `Drive last checked ${relative(queue.last_synced)}`
              : 'Drive has not been synced yet'
          }
        >
          {/* Stays neutral until the answer is known. Saying "not connected"
              while still loading is a claim we cannot yet make, and it is the
              alarming direction to get wrong. */}
          <span
            className={`w-2 h-2 rounded-full ${
              !queue ? 'bg-gray-300 dark:bg-gray-600 animate-pulse'
              : queue.last_synced ? 'bg-green-500'
              : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
          <span className="text-gray-600 dark:text-gray-300">
            {!queue ? 'Checking Drive' : queue.last_synced ? 'Drive connected' : 'Drive not connected'}
          </span>
        </span>

        {queue && (
          <span className="text-xs text-gray-500 dark:text-gray-400" title="Requests waiting to run">
            {queued} queued
          </span>
        )}

        {jobs?.active_run && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Run in progress
          </span>
        )}

        <button
          onClick={triggerRun}
          disabled={busy === 'run' || jobs?.active_run}
          title="Sync your Drive folders, then work through everything queued. Results appear in the gallery."
          className="ml-auto inline-flex items-center justify-center gap-2 font-semibold rounded-lg bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          style={{
            // Bigger than the secondary actions: this is the one button on the
            // card that makes something happen, and at the old size it read as
            // just another control. Shares ACTION_WIDTH with New request so the
            // two primary-ish actions line up rather than being near-but-not-quite.
            fontSize: 'clamp(0.74rem, 0.82vw, 0.85rem)',
            padding: 'clamp(0.36rem, 0.52vw, 0.48rem) clamp(0.75rem, 1vw, 1.05rem)',
            minWidth: ACTION_WIDTH,
          }}
        >
          {busy === 'run'
            ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            : <Play className="w-4 h-4 shrink-0" />}
          Run agent
        </button>
      </div>

      {/* bento */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        style={{ gap: 'clamp(0.55rem, 0.85vw, 0.85rem)' }}
      >

        <Tile
          span
          icon={<IconClipboardList stroke={1.75} />}
          title="Requests"
          hint="Images you have asked the agent to make"
          action={
            <span className="flex items-center gap-2">
              {/* Was a bare 14px icon with no border or padding, which read as
                  decoration rather than a control. Now a labelled button matching
                  New request in height, so the header has two real actions. */}
              <button
                onClick={loadJobs}
                disabled={jobsLoading}
                title="Check both Drive folders for anything new"
                className="inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100 disabled:opacity-50 transition-colors"
                style={{
                  fontSize: 'clamp(0.72rem, 0.8vw, 0.82rem)',
                  padding: 'clamp(0.34rem, 0.5vw, 0.46rem) clamp(0.7rem, 0.95vw, 1rem)',
                }}
              >
                <RefreshCw
                  className={`w-4 h-4 shrink-0 ${jobsLoading ? 'animate-spin' : ''}`}
                />
                {jobsLoading ? 'Syncing' : 'Sync'}
              </button>
              {/* Secondary on purpose. Run agent is the primary action on this
                  card, and two filled buttons in different colours competing a
                  few inches apart is what made these read as wrong. Same navy,
                  stated as an outline rather than a second fill. */}
              <button
                onClick={() => setModal('request')}
                title="Upload an image and describe what you want made"
                className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg border border-[#0b1957]/25 text-[#0b1957] hover:bg-[#0b1957]/[0.06] dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-500/10 transition-colors"
                style={{
                  fontSize: 'clamp(0.74rem, 0.82vw, 0.85rem)',
                  padding: 'clamp(0.36rem, 0.52vw, 0.48rem) clamp(0.75rem, 1vw, 1.05rem)',
                  minWidth: ACTION_WIDTH,
                }}
              >
                <Plus className="w-4 h-4 shrink-0" />
                New request
              </button>
            </span>
          }
        >
          {/* Capped rather than stretched: four counts spread across the full
              width of a three-column tile read as empty boxes, not as figures. */}
          <div
            className="grid grid-cols-4"
            style={{
              gap: 'clamp(0.35rem, 0.55vw, 0.55rem)',
              marginBottom: 'clamp(0.6rem, 0.85vw, 0.9rem)',
              maxWidth: 'min(100%, 34rem)',
            }}
          >
            {([
              ['Queued', jobs?.counts.queued ?? 0, 'Waiting for the next run'],
              ['Running', jobs?.counts.processing ?? 0, 'Being generated now'],
              ['Done', jobs?.counts.completed ?? 0, 'Finished, results in the gallery'],
              ['Closed', jobs?.counts.closed ?? 0, 'Failed or cancelled'],
            ] as const).map(([label, n, hint]) => (
              <div
                key={label}
                title={hint}
                className="rounded-lg bg-gray-50 dark:bg-gray-800/60"
                style={{ padding: 'clamp(0.4rem, 0.6vw, 0.6rem) clamp(0.5rem, 0.75vw, 0.75rem)' }}
              >
                <div
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontSize: 'clamp(0.66rem, 0.72vw, 0.74rem)' }}
                >
                  {label}
                </div>
                {/* From /auto-media/jobs, a separate request to the overview, so
                    these fill on their own rather than waiting for the rest. */}
                {!jobs ? (
                  <Bar w="1.5rem" h="1.15rem" className="mt-1" />
                ) : (
                  <div
                    className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight"
                    style={{ fontSize: 'clamp(1.05rem, 1.3vw, 1.35rem)' }}
                  >
                    {n}
                  </div>
                )}
              </div>
            ))}
          </div>

          {(() => {
            const rows = [
              ...(jobs?.processing || []),
              ...(jobs?.queued || []),
              ...(jobs?.completed || []),
              ...(jobs?.closed || []),
            ].slice(0, 4);
            // Only claim there is nothing once we actually know. Before the jobs
            // call returns, rows is empty because it has not loaded, not because
            // the queue is empty, and saying "Nothing yet" then is simply wrong.
            if (!jobs) {
              return (
                <div className="space-y-2 py-1">
                  <Bar w="72%" />
                  <Bar w="54%" />
                </div>
              );
            }
            if (!rows.length) {
              return (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Nothing yet. Upload an image, or drop one in your Drive requests folder.
                </p>
              );
            }
            return (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((job) => (
                  <li
                    key={job.group_id}
                    className="flex items-center gap-2"
                    style={{
                      padding: 'clamp(0.3rem, 0.45vw, 0.45rem) 0',
                      fontSize: 'clamp(0.78rem, 0.86vw, 0.9rem)',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      title={job.status}
                      style={{
                        background:
                          job.status === 'tracked' ? '#D85A30'
                          : job.status === 'in_progress' ? '#BA7517'
                          : job.status === 'done' ? '#1D9E75'
                          : '#888780',
                      }}
                    />
                    <span className="flex-1 truncate text-gray-800 dark:text-gray-200" title={job.instruction || job.filename}>
                      {job.filename || job.group_id}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0"
                      title={
                        job.source === 'gcs'
                          ? 'Uploaded here. This file is not in your Drive folder.'
                          : 'Came from your Drive requests folder'
                      }
                    >
                      {job.source === 'gcs' ? 'uploaded' : 'drive'}
                    </span>
                    {job.status === 'done' && job.image_count > 0 && (
                      <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                        {job.image_count} images
                      </span>
                    )}
                    {job.status === 'tracked' && (
                      <button
                        onClick={() => cancelJob(job.group_id)}
                        disabled={busy === `cancel:${job.group_id}`}
                        title="Cancel this request. Your file is not deleted."
                        className="shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {busy === `cancel:${job.group_id}`
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <XCircle className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            );
          })()}
        </Tile>

        <Tile
          icon={<IconFingerprint stroke={1.75} />}
          title="Brand profile"
          hint="What the agent believes your brand looks and sounds like"
        >
          {brandPending ? (
            <>
              <TextSkeleton />
              <div className="flex items-center gap-1.5 mt-2">
                <Bar w="1rem" h="1rem" />
                <Bar w="1rem" h="1rem" />
                <Bar w="1rem" h="1rem" />
              </div>
            </>
          ) : defaultProfile ? (
            <>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {defaultProfile.brand_name || label(defaultProfile)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {defaultProfile.tagline || label(defaultProfile)}
              </div>
              {brandColors && (
                <div className="flex items-center gap-1.5 mt-2">
                  {(['primary', 'accent', 'background'] as const)
                    .filter((k) => brandColors[k])
                    .map((k) => (
                      <span
                        key={k}
                        title={`${k}: ${brandColors[k]}`}
                        className="w-4 h-4 rounded border border-gray-200 dark:border-gray-700"
                        style={{ background: brandColors[k] }}
                      />
                    ))}
                  <span className="text-[11px] text-gray-400 ml-1">
                    {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No brand profile yet. Add one so the agent stops inventing a brand.
            </p>
          )}
          <ManageButton onClick={() => setModal('brand')} hint="Add, view, edit or switch brand profiles" />
        </Tile>

        <Tile
          icon={<IconUsersGroup stroke={1.75} />}
          title="Audience"
          hint="Who the agent is writing for"
        >
          {icpPending ? (
            <TextSkeleton />
          ) : icp?.exists ? (
            <>
              {/* Record names like "AI Playground Profile" are internal and mean
                  nothing to a customer, so they are suppressed in favour of the
                  content. A name someone actually chose is still shown. */}
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {icp.name && !/playground|default|untitled|profile$/i.test(icp.name)
                  ? icp.name
                  : 'Your audience'}
              </div>
              <div className="text-gray-500 dark:text-gray-400 line-clamp-2 text-[clamp(0.74rem,0.82vw,0.84rem)]">
                {icpHighlight || 'Saved and used on every generation.'}
              </div>
              <div className="text-gray-400 mt-1.5 text-[clamp(0.66rem,0.74vw,0.75rem)]">
                Saved as your ICP profile
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No audience saved. Without one the agent guesses who it is talking to.
            </p>
          )}
          <ManageButton onClick={() => setModal('audience')} hint="Create or edit your ICP profile" />
        </Tile>

        <Tile
          icon={<IconPhoto stroke={1.75} />}
          title="Reference images"
          hint="Logos and photos the agent can borrow from"
        >
          <div className="flex items-baseline gap-2">
            {assetsPending ? (
              <Bar w="2.5rem" h="1.3rem" />
            ) : (
              <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-[clamp(1.15rem,1.45vw,1.5rem)]">
                {assets?.total ?? 0}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">the agent can draw on</span>
          </div>
          <div className="mt-2 space-y-1">
            {(assets?.categories || []).slice(0, 3).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: CATEGORY_TINTS[i % CATEGORY_TINTS.length] }}
                />
                <span className="flex-1 truncate text-gray-600 dark:text-gray-300">{c.name}</span>
                <span className="text-gray-400 tabular-nums">{c.count}</span>
              </div>
            ))}
            {assetsPending ? (
              <>
                <Bar w="70%" className="mb-1.5" />
                <Bar w="55%" />
              </>
            ) : !assets?.categories?.length ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Nothing uploaded yet.</p>
            ) : null}
          </div>
          <ManageButton onClick={() => setModal('assets')} hint="Upload, describe or remove reference images" />
        </Tile>

        <Tile
          icon={<IconSparkles stroke={1.75} />}
          title="Gallery"
          hint="Everything the agent has generated"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Every image and video the agent has produced for you.
          </p>
          {/* One button, positioned like Manage on the other five tiles. The
              older "Show all" was redundant: the gallery carries its own
              full-history control via onLoadFullHistory. */}
          <ManageButton
            onClick={() => openGallery(false)}
            label="Show recents"
            hint="Open the gallery. It can load your full history from inside."
          />
        </Tile>

        <Tile
          icon={<IconTypography stroke={1.75} />}
          title="Keywords"
          hint="Short words that expand into a longer brief"
        >
          {keywordsPending ? (
            <div className="space-y-1.5">
              <Bar w="58%" />
              <Bar w="44%" />
              <Bar w="66%" />
            </div>
          ) : Object.keys(keywords).length ? (
            <div className="space-y-1">
              {Object.keys(keywords).slice(0, 3).map((token) => (
                <div key={token} className="flex items-center gap-2 text-xs" title={keywords[token]}>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: SWATCH[keywordColors[token] || 'gray'] }}
                  />
                  <span className="font-mono truncate text-gray-700 dark:text-gray-300">{token}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              None yet. Useful because a filename is a poor place to write a brief.
            </p>
          )}
          <ManageButton onClick={() => setModal('shortcuts')} hint="Add or remove keywords" />
        </Tile>

        <Tile
          icon={<IconBrandGoogleDrive stroke={1.75} />}
          title="Google Drive"
          hint="Drop files into a shared folder instead of uploading here"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Two shared folders: one for reference images, one for requests.
          </p>
          <p className="text-gray-400 mt-1.5 text-[clamp(0.66rem,0.74vw,0.75rem)]">
            Synced {relative(queue?.last_synced)}
          </p>
          <ManageButton onClick={() => setModal('drive')} hint="Share folders, manage access, sync now" />
        </Tile>
      </div>

      {/* ── modals ── */}

      {modal === 'request' && (
        <Modal title="New request" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            The file goes to Mr LAD storage, not your Drive folder, so it will not appear
            in Drive. It is queued and generated exactly the same way.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950/40 dark:file:text-indigo-300 mb-3"
          />
          <textarea
            value={uploadInstruction}
            onChange={(e) => setUploadInstruction(e.target.value)}
            rows={3}
            placeholder="What should the agent make? Added to whatever the filename already says."
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 mb-3"
          />
          <label
            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4"
            title="Takes a few minutes. Leave this tab open."
          >
            <input
              type="checkbox"
              checked={uploadRunNow}
              onChange={(e) => setUploadRunNow(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700"
            />
            Generate straight away, otherwise it waits for the next run
          </label>
          {uploadFile && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Ready:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{uploadFile.name}</span>{' '}
              ({(uploadFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
          <button
            onClick={async () => { await uploadWorkOrder(); setModal(null); }}
            disabled={!uploadFile || busy === 'upload'}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadFile && busy !== 'upload'
                ? 'bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700'
                : 'border border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploadRunNow ? 'Upload and generate' : 'Upload and queue'}
          </button>
        </Modal>
      )}

      {modal === 'brand' && (
        <Modal title="Brand profiles" onClose={() => setModal(null)}>
          <div className="flex gap-2 mb-4">
            <input
              value={extractUrl}
              onChange={(e) => setExtractUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              // Held while a run is in flight, with the address still readable,
              // so it is obvious which site is being analysed and a second run
              // cannot be started on top of the first.
              disabled={extractionRunning}
              title={extractionRunning ? 'Analysing this site. One at a time.' : undefined}
              className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800/60 disabled:cursor-not-allowed"
            />
            <button
              onClick={startExtraction}
              disabled={!extractUrl.trim() || extractionRunning}
              title="Read a website and build a brand profile from it"
              className="text-sm font-medium px-3 py-2 rounded-lg bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {extractionRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add from URL'}
            </button>
            <button
              onClick={() => { setModal(null); setShowWizard(true); }}
              title="Build a profile without a website, from material you paste or upload"
              className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
            >
              No website
            </button>
          </div>

          {extractRun && (() => {
            const failed = extractRun.status === 'failed' || extractRun.status === 'error';
            const done = extractRun.status === 'completed';
            const pct = done ? 100 : Math.max(4, Math.min(extractRun.progress ?? 8, 99));
            return (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 px-3 py-2.5 mb-3">
                <div className="flex items-center gap-2 text-xs mb-2">
                  {failed ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  ) : done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b1957] dark:text-blue-400 shrink-0" />
                  )}
                  <span className={
                    failed ? 'text-red-600 dark:text-red-400'
                    : done ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-700 dark:text-gray-200'
                  }>
                    {/* Never extractRun.message. That is MAGe's internal log line,
                        and on failure it is the raw exception. */}
                    {failed
                      ? extractionFailureReason(extractRun.message)
                      : extractionLabel(extractRun.message, extractRun.status)}
                  </span>
                  {!failed && (
                    <span className="ml-auto text-gray-400 tabular-nums">{pct}%</span>
                  )}
                </div>
                {!failed && (
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        done ? 'bg-green-600' : 'bg-[#0b1957] dark:bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {profiles.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No profiles yet. Add one from a URL, or build one without a website.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {profiles.map((p) => (
                <li key={p.domain} className="flex items-center gap-2 py-2.5">
                  <button
                    onClick={() => setDefault(p.is_default ? null : p.domain)}
                    title={p.is_default ? 'This is the default the agent uses' : 'Make this the default'}
                    className={p.is_default ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}
                  >
                    <Star className={`w-4 h-4 ${p.is_default ? 'fill-current' : ''}`} />
                  </button>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-gray-900 dark:text-gray-100 truncate">
                      {p.brand_name || label(p)}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                      {p.tagline || label(p)}
                    </span>
                  </span>
                  {/* Only the default profile carries colours, because it is the
                      only one the card renders swatches for. Fetching them for
                      every row meant opening every profile just to draw a list. */}
                  {p.is_default && p.colors?.primary && (
                    <span
                      className="w-3.5 h-3.5 rounded border border-gray-200 dark:border-gray-700 shrink-0"
                      style={{ background: p.colors.primary }}
                      title={p.colors.primary}
                    />
                  )}
                  <button onClick={() => viewProfile(p.domain)} title="View this profile" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    {dnaLoading === p.domain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setChangeTarget(p.domain)} title="Ask the agent to change this profile" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteProfile(p.domain)} title="Delete this profile" className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {changeTarget && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                What should change about {changeTargetLabel ? label(changeTargetLabel) : changeTarget}?
              </p>
              <textarea
                ref={changeBoxRef}
                value={changeText}
                onChange={(e) => setChangeText(e.target.value)}
                rows={3}
                placeholder="The tagline is out of date, it should read..."
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 mb-2"
              />
              <div className="flex gap-2">
                <button onClick={submitChanges} disabled={busy === 'changes'} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-50">
                  {busy === 'changes' ? 'Sending…' : 'Send'}
                </button>
                <button onClick={() => { setChangeTarget(null); setChangeText(''); }} className="text-sm px-3 py-1.5 rounded-lg text-gray-500">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {modal === 'audience' && (
        <Modal title="Audience" onClose={() => setModal(null)}>
          {icp?.exists ? (
            <>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {icp.name || 'Saved profile'}
              </div>

              {/* Broken into fields rather than dumped as one block. The summary
                  arrives as a run-on string of "Company: x Industry: y What they
                  do: z", which is readable to a machine and to nobody else. */}
              {(() => {
                const raw = icp.summary || icp.description || '';
                const parts = raw
                  .split(/(?=\b(?:Company|Industry|What they do|Target customers|Pain points|Locations|Job titles|Tone|Timezone|Operating hours|Geographic focus)\s*:)/g)
                  .map((s) => s.trim())
                  .filter(Boolean);

                if (parts.length < 2) {
                  return (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                      {raw || 'No detail saved.'}
                    </p>
                  );
                }
                return (
                  <dl className="mt-3 space-y-2">
                    {parts.map((part, i) => {
                      const [label, ...rest] = part.split(':');
                      const value = rest.join(':').trim();
                      if (!value) return null;
                      return (
                        <div key={i}>
                          <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                            {label.trim()}
                          </dt>
                          <dd className="text-sm text-gray-700 dark:text-gray-300">{value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                );
              })()}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nothing saved yet. The agent will guess who it is talking to until you add one.
            </p>
          )}

          {/* Goes to the ICP panel on Advanced Search, which is where an audience
              is actually built. It used to open the media generation chat, which
              is a different feature entirely and could not edit this at all.
              ?open_icp=true is read on mount by that page. */}
          <a
            href="/onboarding/advanced-search-ai?open_icp=true"
            className="inline-block mt-5 text-sm font-medium px-3 py-2 rounded-lg bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700 transition-colors"
          >
            {icp?.exists ? 'Edit your audience' : 'Set up your audience'}
          </a>
        </Modal>
      )}

      {modal === 'assets' && (
        <Modal title="Reference images" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Logos, product shots and photos the agent can borrow from. These are style
            references, not requests.
          </p>
          <BrandAssetsSettings section="assets" />
        </Modal>
      )}

      {modal === 'shortcuts' && (
        <Modal title="Keywords" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Name a file or write a brief using a shortcut and the agent receives the full
            text it stands for.
          </p>
          <div className="flex gap-2 mb-2">
            <input
              value={kwKey}
              onChange={(e) => setKwKey(e.target.value)}
              placeholder="launch-poster"
              // Locked while editing. Saving under a different token would create
              // a second shortcut and leave the original behind, because the
              // write is an upsert keyed on the token itself.
              disabled={!!editingKeyword}
              title={
                editingKeyword
                  ? 'A shortcut cannot be renamed. Delete it and add a new one instead.'
                  : 'No spaces. Hyphens are fine.'
              }
              className="w-40 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800/60"
            />
            <input
              value={kwValue}
              onChange={(e) => setKwValue(e.target.value)}
              placeholder="A launch poster, 1080x1080, brand colours, headline top left"
              className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">Colour</span>
            {Object.keys(SWATCH).map((name) => (
              <button
                key={name}
                onClick={() => setKwColor(name)}
                title={name}
                className={`w-4 h-4 rounded-full transition-transform ${
                  kwColor === name ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-900 scale-110' : ''
                }`}
                style={{ background: SWATCH[name] }}
              />
            ))}
            {editingKeyword && (
              <button
                onClick={clearKeywordForm}
                className="ml-auto text-sm px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            )}
            <button
              onClick={saveKeyword}
              disabled={!kwKey.trim() || !kwValue.trim() || busy === 'keyword'}
              className={`${editingKeyword ? '' : 'ml-auto'} text-sm font-medium px-3 py-1.5 rounded-lg bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-50`}
            >
              {busy === 'keyword' ? 'Saving…' : editingKeyword ? 'Save changes' : 'Add'}
            </button>
          </div>

          {Object.keys(keywords).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">None yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {Object.entries(keywords).map(([token, value]) => (
                <li key={token} className="flex items-center gap-2 py-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: SWATCH[keywordColors[token] || 'gray'] }}
                    title={keywordColors[token] || 'no colour'}
                  />
                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200 shrink-0">{token}</span>
                  <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate" title={value}>{value}</span>
                  <button
                    onClick={() => startEditKeyword(token, value)}
                    title="Edit what this shortcut expands to"
                    className={`transition-colors ${
                      editingKeyword === token
                        ? 'text-[#0b1957] dark:text-blue-300'
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteKeyword(token)}
                    title="Delete this shortcut"
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Check what a brief expands to before you use it.
            </p>
            <div className="flex gap-2">
              <input
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="launch-poster for the new release"
                className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2"
              />
              <button onClick={runPreview} disabled={!previewText.trim()} className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50">
                Preview
              </button>
            </div>
            {previewResult && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 whitespace-pre-wrap">
                {previewResult.expanded}
              </p>
            )}
          </div>
        </Modal>
      )}

      {modal === 'drive' && (
        <Modal title="Google Drive" onClose={() => setModal(null)}>
          <BrandAssetsSettings section="drive" />
        </Modal>
      )}

      {/* Both of these draw their own panel, so they need a bare overlay and
          nothing else. Without it the gallery lays out in the grid as a seventh
          tile, and wrapping the DNA viewer in Modal puts a second titled box
          around a component that already has one. */}
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
            phase={viewingDna.from_crawl ? 'Business DNA' : 'Business DNA, described not crawled'}
            // A missing logo tells the customer to add one to the Drive folder.
            // We are already on the page that manages it, so open that panel
            // here instead of sending them on a round trip through the URL.
            onOpenReferenceImages={() => {
              setViewingDna(null);
              setModal('assets');
            }}
          />
        </div>
      )}

      {showWizard && (
        <Modal title="Build a brand profile" onClose={() => setShowWizard(false)}>
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
        </Modal>
      )}

      {showMediaChat && <MediaGenerationModal isOpen onClose={() => setShowMediaChat(false)} />}
    </div>
  );
};

/**
 * Build a Business DNA without a website.
 *
 * Paste text, upload documents, or answer questions. They combine, and the
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
            Paste anything you already have: brand guidelines, an About page, positioning
            notes, or upload a document. If you have nothing written down, skip straight to
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
