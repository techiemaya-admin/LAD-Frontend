'use client';
/**
 * Brand Assets — the tenant's persistent library of reference imagery for
 * media generation. Reached from Settings → Integrations → Brand Assets.
 *
 * Two ways in, one library:
 *   • Upload directly here. Works everywhere.
 *   • Drop files into a shared Google Drive folder we create and share with
 *     the user. Optional per environment; hidden when not configured.
 *
 * There is no "import" button — Drive is checked when this page opens and
 * again whenever a media generation session starts. The user's only job is to
 * add files.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ImageIcon,
  StickyNote,
  Loader2,
  UploadCloud,
  Trash2,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { safeStorage } from '@lad/shared/storage';

type AssetSource = 'drive' | 'upload';

interface BrandAsset {
  id: string;
  source: AssetSource;
  key: string;
  category: string;
  context: string;
  note: string;
  enabled: boolean;
  filename: string;
  source_name?: string;
  size?: number;
  added_at?: string;
  modified_time?: string;
  preview_url?: string | null;
}

interface Collaborator {
  permission_id: string;
  email: string;
  role: string;
  name?: string | null;
}

interface BrandAssetsStatus {
  enabled: boolean;
  drive_enabled: boolean;
  drive_connected: boolean;
  folder_id?: string | null;
  folder_url?: string | null;
  folder_name?: string;
  work_folder_id?: string | null;
  work_folder_url?: string | null;
  work_folder_name?: string;
  collaborators?: Collaborator[];
  roles?: string[];
  asset_count: number;
  active_count: number;
  last_synced?: string | null;
  assets: BrandAsset[];
}

// Drive's own role names, in the words a customer actually understands.
const ROLE_LABELS: Record<string, string> = {
  reader: 'Can view',
  commenter: 'Can comment',
  writer: 'Can edit',
};

const WORKER_URL =
  process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || 'http://localhost:8080';

const formatSize = (bytes?: number) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Sync times need the clock, not just the day — "2 Aug" is useless for "did it just run?". */
const formatDateTime = (iso?: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

export const BrandAssetsSettings: React.FC = () => {
  const [status, setStatus] = useState<BrandAssetsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [connectEmail, setConnectEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('writer');
  const [inviting, setInviting] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const didCheckRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const authHeader = useCallback((): Record<string, string> => {
    const token = safeStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const jsonHeaders = useCallback(
    (): Record<string, string> => ({ 'Content-Type': 'application/json', ...authHeader() }),
    [authHeader],
  );

  const readError = async (res: Response, fallback: string) => {
    try {
      const body = await res.json();
      return body?.detail || fallback;
    } catch {
      return fallback;
    }
  };

  const loadStatus = useCallback(async (): Promise<BrandAssetsStatus | null> => {
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/status`, { headers: authHeader() });
      if (!res.ok) throw new Error(await readError(res, 'Could not load your assets.'));
      const data: BrandAssetsStatus = await res.json();
      setStatus(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your assets.');
      return null;
    }
  }, [authHeader]);

  /**
   * Background pull, run once when the card opens. Stays quiet: a failure here
   * just means the list is as of the last successful sync, which is not worth
   * an error banner the user did not ask for.
   */
  const checkDrive = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/sync`, {
        method: 'POST',
        headers: jsonHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.added > 0 || result.removed > 0) await loadStatus();
      }
    } catch {
      // Best-effort: a failed check just means the list is as of the last sync.
    } finally {
      setChecking(false);
    }
  }, [jsonHeaders, loadStatus]);

  /**
   * The same sync, but user-initiated — so unlike `checkDrive` it reports what
   * happened, including "nothing changed", and surfaces errors. Someone who
   * just dropped a file in Drive needs to know whether we saw it.
   */
  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/sync`, {
        method: 'POST',
        headers: jsonHeaders(),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not sync with Drive.'));
      const result = await res.json();
      await loadStatus();

      const parts: string[] = [];
      if (result.added) parts.push(`${result.added} added`);
      if (result.removed) parts.push(`${result.removed} removed`);
      if (result.skipped?.length) parts.push(`${result.skipped.length} skipped`);

      if (!parts.length) {
        setNotice('Already up to date — nothing new in your Drive folder.');
      } else if (result.remaining > 0) {
        // The worker caps each pass so it cannot outrun the request hold, so
        // say so plainly rather than leaving files silently unimported.
        parts.push(`${result.remaining} still waiting — sync again to finish`);
        setNotice(parts.join(', ') + '.');
      } else {
        setNotice(parts.join(', ') + '.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sync with Drive.');
    } finally {
      setSyncing(false);
    }
  }, [jsonHeaders, loadStatus]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await loadStatus();
      setLoading(false);
      if (data?.drive_connected && !didCheckRef.current) {
        didCheckRef.current = true;
        checkDrive();
      }
    })();
  }, [loadStatus, checkDrive]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (list.length === 0) {
        setError('Only image files can be used as brand assets.');
        return;
      }

      setUploading(true);
      setError('');
      setNotice('');
      try {
        const form = new FormData();
        list.forEach((f) => form.append('files', f));

        const res = await fetch(`${WORKER_URL}/brand-assets/upload`, {
          method: 'POST',
          headers: authHeader(), // no Content-Type — the browser sets the boundary
          body: form,
        });
        if (!res.ok) throw new Error(await readError(res, 'Upload failed.'));

        const result = await res.json();
        await loadStatus();

        if (result.rejected?.length) {
          setNotice(
            `Added ${result.added}. Skipped: ${result.rejected.join(', ')}.`,
          );
        } else {
          setNotice(`Added ${result.added} file${result.added === 1 ? '' : 's'}.`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [authHeader, loadStatus],
  );

  const handleConnect = async () => {
    const email = connectEmail.trim();
    if (!email) {
      setError('Enter the Google account you want the folder shared with.');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/connect`, {
        method: 'POST',
        headers: jsonHeaders(),
        // notify is deliberately omitted so the worker decides via
        // BRAND_ASSETS_NOTIFY_ON_SHARE (off by default). Drive sends share
        // invites as the authenticated principal, and ours is the service
        // account, so a notification arrives as "mage-ads-project@...
        // gserviceaccount.com has invited you" and reads as spam. Access is
        // granted either way; the notice below surfaces the folder instead.
        body: JSON.stringify({ email, role: 'writer' }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not create the folder.'));
      setConnectEmail('');
      setNotice(`Folder shared with ${email}. Open it from the button below.`);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the folder.');
    } finally {
      setConnecting(false);
    }
  };

  const addCollaborator = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      setError('Enter an email address to give access to.');
      return;
    }
    setInviting(true);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/collaborators/add`, {
        method: 'POST',
        headers: jsonHeaders(),
        // As in handleConnect: let BRAND_ASSETS_NOTIFY_ON_SHARE decide rather
        // than forcing an invite from the service account address.
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not grant access.'));
      setInviteEmail('');
      setNotice(`${email} now has access.`);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not grant access.');
    } finally {
      setInviting(false);
    }
  };

  const changeCollaboratorRole = async (email: string, role: string) => {
    setBusyEmail(email);
    setError('');
    try {
      // Add is idempotent and doubles as "change role", so there is only one
      // endpoint to call here. No notification — nobody needs an email to be
      // told their access level moved.
      const res = await fetch(`${WORKER_URL}/brand-assets/collaborators/add`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ email, role, notify: false }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not change access.'));
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change access.');
    } finally {
      setBusyEmail(null);
    }
  };

  const removeCollaborator = async (email: string) => {
    if (!window.confirm(`Remove ${email}'s access to this folder?`)) return;
    setBusyEmail(email);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/collaborators/remove`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not remove access.'));
      setNotice(`${email} no longer has access.`);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove access.');
    } finally {
      setBusyEmail(null);
    }
  };

  const toggleAsset = async (asset: BrandAsset) => {
    setBusyId(asset.id);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/toggle`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ asset_id: asset.id, enabled: !asset.enabled }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not update the file.'));
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the file.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteAsset = async (asset: BrandAsset) => {
    if (!window.confirm(`Delete "${asset.source_name || asset.filename}" permanently?`)) return;
    setBusyId(asset.id);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/delete`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ asset_id: asset.id }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not delete the file.'));
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the file.');
    } finally {
      setBusyId(null);
    }
  };

  const saveNote = async (assetId: string) => {
    setSavingNote(true);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/brand-assets/note`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ asset_id: assetId, note: noteDraft }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Could not save the note.'));
      setEditingId(null);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the note.');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#060b21] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-full max-w-md bg-gray-100 dark:bg-gray-900 rounded" />
        </div>
      </div>
    );
  }

  if (status && !status.enabled) {
    return (
      <div className="bg-white dark:bg-[#060b21] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-gray-900 dark:text-gray-100 text-lg font-semibold">
              Brand assets are not available
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This environment is missing its storage configuration. Please contact an
              administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Upload ── */}
      <div className="bg-white dark:bg-[#060b21] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-gray-900 dark:text-gray-100 text-lg font-semibold">
          Brand Assets
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
          Logos, product shots and anything else you want to appear in generated media. We
          describe each one so the AI knows when to use it.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        {notice && !error && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-300">{notice}</p>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/20'
              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Uploading and describing your files…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Drop images here, or click to browse
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                PNG, JPG, WEBP, GIF or SVG · up to 15MB each
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Drive folder (only when the environment has it) ── */}
      {status?.drive_enabled && (
        <div className="bg-white dark:bg-[#060b21] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-gray-900 dark:text-gray-100 text-base font-semibold">
                  Or use your shared Drive folder
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                  We&apos;ll create a Google Drive folder and share it with you. Anything you
                  drop in shows up here automatically — your files stay yours.
                </p>
              </div>
            </div>

            {status.drive_connected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-medium shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            )}
          </div>

          {!status.drive_connected ? (
            <div className="mt-5">
              <label
                htmlFor="brand-assets-connect-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5"
              >
                Your Google account
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="brand-assets-connect-email"
                  type="email"
                  value={connectEmail}
                  onChange={(e) => setConnectEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !connecting) handleConnect();
                  }}
                  placeholder="you@example.com"
                  className="flex-1 min-w-[240px] px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleConnect}
                  disabled={connecting || !connectEmail.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1957] hover:bg-[#152a7a] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  {connecting ? 'Creating your folder…' : 'Add'}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-start gap-1.5">
                <HardDrive className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Must be an account with Google Drive enabled. The folder appears under
                  &quot;Shared with me&quot; straight away — no invite to accept.
                </span>
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <a
                  href={status.folder_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {status.folder_name || 'folder'} in Drive
                </a>

                {status.work_folder_url && (
                  <a
                    href={status.work_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open {status.work_folder_name || 'Work_Orders'} in Drive
                  </a>
                )}

                <button
                  onClick={handleManualSync}
                  disabled={syncing || checking}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1957] hover:bg-[#152a7a] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>

                {checking && !syncing && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking for new files…
                  </span>
                )}
                {status.last_synced && !syncing && !checking && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Last synced {formatDateTime(status.last_synced)}
                  </span>
                )}
              </div>

              {/* ── Who can reach the folder ── */}
              <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  People with access
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                  Access covers <strong>both folders</strong> — they appear under
                  &quot;Shared with me&quot; in that person&apos;s own Drive. Editors can
                  add and remove files; viewers can only look. Removing someone revokes
                  both. Share the folder links with them — no invite email is sent.
                </p>

                {(status.collaborators || []).length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {(status.collaborators || []).map((person) => (
                      <li
                        key={person.permission_id || person.email}
                        className="flex flex-wrap items-center gap-2 justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0a1027] border border-gray-200 dark:border-gray-800"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate min-w-0">
                          {person.email}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <select
                            value={person.role}
                            disabled={busyEmail === person.email}
                            onChange={(e) =>
                              changeCollaboratorRole(person.email, e.target.value)
                            }
                            aria-label={`Access level for ${person.email}`}
                            className="text-xs px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#060b21] text-gray-700 dark:text-gray-200 disabled:opacity-60"
                          >
                            {(status.roles || ['reader', 'commenter', 'writer']).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r] || r}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeCollaborator(person.email)}
                            disabled={busyEmail === person.email}
                            aria-label={`Remove ${person.email}`}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60 transition-colors"
                          >
                            {busyEmail === person.email ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !inviting) addCollaborator();
                    }}
                    placeholder="teammate@example.com"
                    aria-label="Email address to give access to"
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    aria-label="Access level"
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1027] text-sm text-gray-700 dark:text-gray-200"
                  >
                    {(status.roles || ['reader', 'commenter', 'writer']).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r] || r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addCollaborator}
                    disabled={inviting || !inviteEmail.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-60 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                  >
                    {inviting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Give access
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Library ── */}
      <div className="bg-white dark:bg-[#060b21] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
          <h3 className="text-gray-900 dark:text-gray-100 text-base font-semibold">
            Your files
          </h3>
          {status && status.asset_count > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {status.active_count} of {status.asset_count} in use
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Add a note to say how a file should be used, or switch one off to keep it without
          using it in new media.
        </p>

        {!status || status.assets.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nothing here yet — upload an image to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {status.assets.map((asset) => (
              <div
                key={asset.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-opacity ${
                  asset.enabled
                    ? 'border-gray-100 dark:border-gray-800'
                    : 'border-gray-100 dark:border-gray-800 opacity-55'
                }`}
              >
                <div className="w-14 h-14 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {asset.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.preview_url}
                      alt={asset.source_name || asset.key}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {asset.source_name || asset.filename}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0"
                      title={asset.source === 'drive' ? 'From your Drive folder' : 'Uploaded here'}
                    >
                      {asset.source === 'drive' ? (
                        <><HardDrive className="w-2.5 h-2.5" /> Drive</>
                      ) : (
                        <><UploadCloud className="w-2.5 h-2.5" /> Uploaded</>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {[
                      asset.category,
                      formatSize(asset.size),
                      formatDate(asset.modified_time || asset.added_at),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {asset.context}
                  </p>

                  {editingId === asset.id ? (
                    <div className="mt-3">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        maxLength={500}
                        rows={2}
                        autoFocus
                        placeholder="How should this file be used?"
                        className="w-full text-sm p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#000724] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => saveNote(asset.id)}
                          disabled={savingNote}
                          className="px-3 py-1.5 bg-[#0B1957] hover:bg-[#152a7a] disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {savingNote ? 'Saving…' : 'Save note'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                        <span className="text-xs text-gray-300 dark:text-gray-600 ml-auto">
                          {noteDraft.length}/500
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-start gap-3 flex-wrap">
                      {asset.note ? (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex-1 min-w-[200px]">
                          <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-900 dark:text-amber-300 flex-1">
                            {asset.note}
                          </p>
                          <button
                            onClick={() => {
                              setEditingId(asset.id);
                              setNoteDraft(asset.note);
                            }}
                            className="text-xs text-amber-700 dark:text-amber-500 hover:underline shrink-0"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(asset.id);
                            setNoteDraft('');
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                          Add a note
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Per-file actions ── */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <label
                    className="inline-flex items-center gap-2 cursor-pointer select-none"
                    title={asset.enabled ? 'In use for new media' : 'Not used in new media'}
                  >
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {asset.enabled ? 'In use' : 'Off'}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={asset.enabled}
                      disabled={busyId === asset.id}
                      onChange={() => toggleAsset(asset)}
                    />
                    <span className="relative w-9 h-5 rounded-full bg-gray-200 dark:bg-gray-700 peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
                  </label>

                  {asset.source === 'upload' ? (
                    <button
                      onClick={() => deleteAsset(asset)}
                      disabled={busyId === asset.id}
                      title="Delete permanently"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="text-[10px] text-gray-300 dark:text-gray-600 text-right max-w-[92px] leading-tight"
                      title="This file lives in your Drive folder — delete it there to remove it entirely."
                    >
                      delete in Drive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandAssetsSettings;
