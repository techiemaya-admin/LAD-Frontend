"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Search, Check, X, Loader2, FileText, Star,
  Image as ImageIcon, Video, File as FileIcon, Upload, Link, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ── Types ─────────────────────────────────────────────────────────────
interface PersonalWaTemplate {
  id: string;
  name: string;
  content: string;
  description: string | null;
  header_text: string | null;
  footer_text: string | null;
  tags: string[];
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  media_type?: 'image' | 'video' | 'document' | null;
  media_url?: string | null;
  media_filename?: string | null;
}

type MediaType = 'none' | 'image' | 'video' | 'document';

interface TemplateFormData {
  name: string;
  content: string;
  description: string;
  header_text: string;
  footer_text: string;
  is_default: boolean;
  media_type: MediaType;
  media_url: string;
  media_filename: string;
}

const EMPTY_FORM: TemplateFormData = {
  name: '',
  content: '',
  description: '',
  header_text: '',
  footer_text: '',
  is_default: false,
  media_type: 'none',
  media_url: '',
  media_filename: '',
};

const API = '/api/whatsapp-conversations/conversations/templates';
const UPLOAD_API = '/api/whatsapp-conversations/conversations/templates/upload-media?channel=personal';

// Count {{variable}} placeholders
function countPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g);
  return matches ? [...new Set(matches)] : [];
}

const mediaTypeIcons: Record<MediaType, React.ReactNode> = {
  none: null,
  image: <ImageIcon className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
  document: <FileIcon className="h-3.5 w-3.5" />,
};

const mediaAccept: Record<string, string> = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/3gpp,video/quicktime',
  document: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
};

// ── Template Form Dialog ──────────────────────────────────────────────
function TemplateFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: TemplateFormData;
  onSave: (data: TemplateFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<TemplateFormData>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [urlMode, setUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setUploading(false);
      setUploadError('');
      setUrlMode(false);
    }
  }, [open, initial]);

  const placeholders = countPlaceholders(form.content);

  function set<K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMediaTypeChange(type: MediaType) {
    set('media_type', type);
    if (type === 'none') {
      set('media_url', '');
      set('media_filename', '');
      setUploadError('');
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('media_type', form.media_type !== 'none' ? form.media_type : 'document');

      const res = await fetch(UPLOAD_API, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          // Don't set Content-Type — browser sets multipart boundary automatically
          ...(typeof window !== 'undefined' ? {
            Authorization: `Bearer ${document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')?.[1] || ''}`,
          } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      set('media_url', data.url || '');
      set('media_filename', data.filename || file.name);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Try pasting a URL instead.');
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function clearMedia() {
    set('media_url', '');
    set('media_filename', '');
    setUploadError('');
  }

  const hasMedia = form.media_type !== 'none' && form.media_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#000724] border-slate-200 dark:border-slate-800/60 rounded-2xl shadow-2xl custom-scrollbar outline-none focus:outline-none max-md:w-[80vw] max-md:max-w-[80vw] max-md:max-h-[78vh] max-md:p-0">
        <DialogHeader className="bg-slate-50 dark:bg-[#000724] px-5 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 rounded-t-2xl text-left shrink-0">
          <div className="text-slate-900 dark:text-white font-bold text-base md:text-lg tracking-tight">
            {initial.name ? 'Edit Template' : 'New Template'}
          </div>
          <div className="sr-only">Template Form configuration modal options view</div>
        </DialogHeader>

        <div className="space-y-6 md:space-y-5 px-5 md:px-4 py-5 md:py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Template Name *</label>
            <Input
              placeholder="e.g. Welcome Message"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="bg-white dark:bg-[#00051d] border-slate-200 dark:border-slate-800/80 text-sm rounded-xl h-11 text-slate-800 dark:text-white"
            />
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
              <label className="text-slate-700 md:text-slate-500 dark:text-slate-400">
                <span className="hidden md:inline">Header (optional)</span>
                <span className="inline md:hidden">Header (optional)</span>
              </label>
            </div>
            <Input
              placeholder="Short header text line"
              value={form.header_text}
              onChange={(e) => set('header_text', e.target.value)}
              className="bg-white dark:bg-[#00051d] border-slate-200 dark:border-slate-800/80 text-sm rounded-xl h-11 text-slate-800 dark:text-white"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <label className="text-slate-700 dark:text-slate-200">Message Body *</label>
            </div>
            <div className="md:border-none border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#00051d] md:bg-transparent">
            <Textarea
              placeholder={"Hi {{name}}, thanks for reaching out!\n\nUse {{variable}} for dynamic placeholders."}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={5}
              className="w-full resize-none font-mono text-sm bg-transparent md:bg-white dark:md:bg-[#00051d] border-none md:border md:border-slate-200 md:dark:border-slate-800/80 rounded-none md:rounded-xl text-slate-800 dark:text-white p-3 focus:ring-0 focus-visible:ring-0 outline-none"
            />
            <div className="text-[11px] text-slate-400 dark:text-slate-400/70 leading-normal">
              <div className="hidden md:block">
              Use <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">{'{{name}}'}</code> for contact name,{' '}
              <code className="px-1 py-0.5 rounded bg-muted">{'{{1}}'}</code> for custom variables.
              Variables are auto-corrected to double-brace format on save.
            </div>
            {placeholders.length > 0 && (
              <p className="text-xs text-muted-foreground hidden md:block">
                Detected: {placeholders.map((p) => (
                  <code key={p} className="mx-0.5 px-1 py-0.5 rounded bg-muted text-xs">{`{{${p}}}`}</code>
                ))}
              </p>
            )}
          </div>
        </div>
     </div>

          {/* Footer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
              <label className="text-slate-500 dark:text-slate-400">
                <span className="hidden md:inline">Footer (optional)</span>
                <span className="inline md:hidden">Footer(optional)</span>
              </label>
            </div>
            <Input
              placeholder="e.g. Reply STOP to unsubscribe"
              value={form.footer_text}
              onChange={(e) => set('footer_text', e.target.value)}
              className="bg-white dark:bg-[#00051d] border-slate-200 dark:border-slate-800/80 text-sm rounded-xl h-11 text-slate-800 dark:text-white"
            />
          </div>

          {/* ── Media Attachment ─────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Media Attachment  (optional)</label>

            {/* Type selector */}
            <div className="flex flex-row flex-nowrap gap-1 bg-slate-50/80 dark:bg-[#000724]/60 md:bg-transparent p-1 md:p-0 rounded-xl md:rounded-none border border-slate-100 dark:border-slate-800/60 md:border-none w-full overflow-x-hidden">
              {(['none', 'image', 'video', 'document'] as MediaType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMediaTypeChange(type)}
                  className={cn(
                    'flex-1 md:flex-initial flex items-center justify-center gap-1 px-1 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold border-none outline-none transition-all cursor-pointer capitalize shrink-0',
                    form.media_type === type
                      ? 'bg-[#0B1957] md:bg-[#2563eb] text-white shadow-sm'
                      : 'bg-white dark:bg-[#000724] md:bg-white md:dark:bg-[#000724] text-slate-600 dark:text-slate-400 md:border md:border-slate-200 md:dark:border-slate-800 hover:bg-slate-100'
                  )}
                >
                  {type !== 'none' && <span className="scale-90 md:scale-100">{mediaTypeIcons[type]}</span>}
                  <span>{type === 'none' ? 'None' : type === 'document' ? 'Doc' : type}</span>
                </button>
              ))}
            </div>

            {/* Upload area — shown when type is not none */}
            {form.media_type !== 'none' && (
              <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                {hasMedia ? (
                  // Media preview + clear
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#000724] p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{mediaTypeIcons[form.media_type]}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate font-medium">
                        {form.media_filename || form.media_url}
                      </span>
                      <button
                        type="button"
                        onClick={clearMedia}
                        className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                    {form.media_type === 'image' && (
                      <img
                        src={form.media_url}
                        alt="Preview"
                        className="mt-2 max-h-32 rounded object-contain w-full bg-muted"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                ) : (
                  // Upload / URL input
                  <div className="space-y-2">
                    {!urlMode ? (
                      <div
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-5 cursor-pointer bg-white dark:bg-[#000724] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : (
                          <Upload className="h-5 w-5 text-slate-400" />
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                          {uploading
                            ? 'Uploading\u2026'
                            : `Click to upload ${form.media_type} file`}
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={mediaAccept[form.media_type] || '*'}
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={uploading}
                        />
                      </div>
                    ) : null}

                    {/* URL toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUrlMode((v) => !v)}
                        className="text-xs text-slate-400 dark:text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Link className="h-3 w-3" />
                        {urlMode ? 'Use file upload instead' : 'Or paste a URL'}
                      </button>
                    </div>

                    {urlMode && (
                      <Input
                        placeholder={`Paste ${form.media_type} URL (https://...)`}
                        value={form.media_url}
                        onChange={(e) => {
                          set('media_url', e.target.value);
                          set('media_filename', e.target.value.split('/').pop() || '');
                        }}
                        className="text-sm bg-white dark:bg-[#00051d] border-slate-200 dark:border-slate-800 rounded-xl h-10 text-white"
                      />
                    )}

                    {uploadError && (
                      <p className="text-xs text-destructive">{uploadError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Description(optional)
            </label>
            <div className="block md:hidden">
          <textarea
            placeholder="Internal note about this template..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full resize-none text-sm bg-white dark:bg-[#00051d] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white p-3 outline-none"
          />
            </div>
            <div className="hidden md:block">
            <Input
              placeholder="Internal notes"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="bg-white dark:bg-[#00051d] border-slate-200 dark:border-slate-800 text-sm rounded-xl h-11 text-slate-800 dark:text-white"
            />
            </div>

          {/* Default Template checkbox element */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none group w-fit pt-1">
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                form.is_default ? 'bg-[#2563eb] border-[#2563eb]' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#00051d]'
              )}
              onClick={() => set('is_default', !form.is_default)}
            >
              {form.is_default && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Set as default template</span>
          </label>
        </div>

        </div>

        {/* Action Buttons Footer Container */}
        <DialogFooter className="bg-slate-50 dark:bg-[#000724] px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 rounded-b-2xl mt-4 shrink-0 flex flex-row items-center justify-end">
          <Button
            onClick={() => onSave(form)}
            disabled={saving || uploading || !form.name.trim() || !form.content.trim()}
            className="w-full sm:w-auto h-11 bg-[#2563eb] hover:bg-[#2563eb]/90 dark:bg-[#1d4ed8] dark:hover:bg-blue-700 text-white font-bold rounded-xl px-6 active:scale-[0.98] transition-all cursor-pointer shadow-md border-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Template
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export function PersonalWaTemplateManager() {
  const [templates, setTemplates] = useState<PersonalWaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<TemplateFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PersonalWaTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTenant(`${API}?channel=personal`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Create ───────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setFormInitial(EMPTY_FORM);
    setFormOpen(true);
  }

  // ── Edit ─────────────────────────────────────────────────────────
  function openEdit(t: PersonalWaTemplate) {
    setEditingId(t.id);
    setFormInitial({
      name: t.name,
      content: t.content,
      description: t.description || '',
      header_text: t.header_text || '',
      footer_text: t.footer_text || '',
      is_default: t.is_default,
      media_type: (t.media_type as MediaType) || 'none',
      media_url: t.media_url || '',
      media_filename: t.media_filename || '',
    });
    setFormOpen(true);
  }

  // ── Save (create or update) ──────────────────────────────────────
  async function handleSave(data: TemplateFormData) {
    setSaving(true);
    try {
      // Normalize variable placeholders: {name}} or {name} → {{name}}
      const normalizeVars = (text: string) =>
        text.replace(/\{+([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}+/g, (_: string, v: string) => `{{${v}}}`);

      const body: Record<string, any> = {
        name: data.name.trim(),
        content: normalizeVars(data.content.trim()),
        description: data.description.trim() || null,
        header_text: data.header_text.trim() || null,
        footer_text: data.footer_text.trim() || null,
        is_default: data.is_default,
        media_type: data.media_type !== 'none' ? data.media_type : null,
        media_url: (data.media_url ?? '').trim() || null,
        media_filename: (data.media_filename ?? '').trim() || null,
      };

      if (editingId) {
        await fetchWithTenant(`${API}/${editingId}?channel=personal`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await fetchWithTenant(`${API}?channel=personal`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      setFormOpen(false);
      await fetchTemplates();
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchWithTenant(`${API}/${deleteTarget.id}?channel=personal`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchTemplates();
    } finally {
      setDeleting(false);
    }
  }

  // ── Filter ───────────────────────────────────────────────────────
  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#071131] rounded-2xl border border-slate-200 dark:border-blue-950/40 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-blue-950/40 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40">
            <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Personal WA Templates</h2>
            <p className="text-xs text-slate-400 dark:text-slate-300 mt-0.5">
              Saved messages — no Meta approval required
            </p>
          </div>
        </div>
      </div>

      {/* Search & Action Row */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-blue-950/40 shrink-0 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="relative flex-1">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-400/80" />
          </div>
          <Input
            className="pl-11 h-10 text-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-blue-950/40 rounded-xl text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] dark:text-white dark:hover:bg-blue-700 rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
                onClick={openCreate}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span className="inline">New Template</span>
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-2 outline-none focus:outline-none focus-visible:outline-none">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-slate-400 dark:text-slate-500">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {search ? 'No matching templates found' : 'No templates built yet'}</p>
            {!search && (
              <Button variant="outline" size="sm" onClick={openCreate}
                      className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white dark:bg-[#1d4ed8] dark:text-white dark:hover:bg-blue-700 rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2 border-none cursor-pointer"
              >
                Create your first template
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {filtered.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onEdit={() => openEdit(t)}
                onDelete={() => setDeleteTarget(t)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Form dialog */}
      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={formInitial}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="bg-white dark:bg-[#000724] border border-slate-200 dark:border-slate-800 max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold text-lg">Delete template?</DialogTitle>
            <DialogDescription className="text-slate-400 dark:text-slate-400 text-sm pt-1 leading-relaxed">
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 flex sm:flex-row flex-col justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-300 hover:bg-slate-800 h-11 font-semibold">Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl h-11 px-4 cursor-pointer sm:ml-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Template Row ──────────────────────────────────────────────────────
function TemplateRow({
  template: t,
  onEdit,
  onDelete,
}: {
  template: PersonalWaTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const placeholders = countPlaceholders(t.content);

  return (
    <div className="group px-4 py-4 bg-white dark:bg-[#000724] hover:bg-slate-50 dark:hover:bg-[#000724]/60 border border-slate-100 dark:border-slate-800/50 rounded-xl shadow-sm transition-all my-2 mx-3">
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{t.name}</span>
            {t.is_default && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
            {t.media_type && (
              <Badge className="text-[10px] font-bold py-0.5 px-2 h-4.5 gap-1 flex items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-none">
                {t.media_type === 'image' && <ImageIcon className="h-2.5 w-2.5" />}
                {t.media_type === 'video' && <Video className="h-2.5 w-2.5" />}
                {t.media_type === 'document' && <FileIcon className="h-2.5 w-2.5" />}
                {t.media_type}
              </Badge>
            )}
          </div>
          {t.header_text && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">
              {t.header_text}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 whitespace-pre-wrap leading-relaxed">
            {t.content}
          </p>
          {t.footer_text && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate italic font-medium">
              {t.footer_text}
            </p>
          )}
          {placeholders.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {placeholders.map((p) => (
                <Badge key={p} variant="secondary" className="text-[10px] font-bold py-0 px-2 h-4.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-none">
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all shrink-0 bg-white dark:bg-[#00051d] border border-slate-100 dark:border-slate-800 rounded-xl p-0.5 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onEdit}
            title="Edit template"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            onClick={onDelete}
            title="Delete template"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
        {t.usage_count > 0 && <span>Used {t.usage_count}\xd7</span>}
        {!t.is_active && (
          <Badge className="text-[10px] font-bold py-0 px-1.5 h-4 bg-transparent border border-slate-200 dark:border-slate-800 text-slate-400">
            Inactive
          </Badge>
        )}
      </div>
    </div>
  );
}
