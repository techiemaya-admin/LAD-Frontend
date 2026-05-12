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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.name ? 'Edit Template' : 'New Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Template Name *</label>
            <Input
              placeholder="e.g. Welcome Message"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Header (optional)</label>
            <Input
              placeholder="Short header line"
              value={form.header_text}
              onChange={(e) => set('header_text', e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message Body *</label>
            <Textarea
              placeholder={"Hi {{name}}, thanks for reaching out!\n\nUse {{variable}} for dynamic placeholders."}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={5}
              className="resize-none font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Use <code className="px-1 py-0.5 rounded bg-muted">{'{{name}}'}</code> for contact name,{' '}
              <code className="px-1 py-0.5 rounded bg-muted">{'{{1}}'}</code> for custom variables.
              Variables are auto-corrected to double-brace format on save.
            </p>
            {placeholders.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detected: {placeholders.map((p) => (
                  <code key={p} className="mx-0.5 px-1 py-0.5 rounded bg-muted text-xs">{`{{${p}}}`}</code>
                ))}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Footer (optional)</label>
            <Input
              placeholder="e.g. Reply STOP to unsubscribe"
              value={form.footer_text}
              onChange={(e) => set('footer_text', e.target.value)}
            />
          </div>

          {/* ── Media Attachment ─────────────────────────────────────── */}
          <div className="space-y-2 border border-border rounded-lg p-3">
            <label className="text-sm font-medium">Media Attachment (optional)</label>

            {/* Type selector */}
            <div className="flex gap-2">
              {(['none', 'image', 'video', 'document'] as MediaType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMediaTypeChange(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors capitalize',
                    form.media_type === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                  )}
                >
                  {type !== 'none' && mediaTypeIcons[type]}
                  {type === 'none' ? 'None' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Upload area — shown when type is not none */}
            {form.media_type !== 'none' && (
              <div className="space-y-2">
                {hasMedia ? (
                  // Media preview + clear
                  <div className="relative rounded-md border border-border bg-muted/30 p-2.5">
                    <div className="flex items-center gap-2">
                      {mediaTypeIcons[form.media_type]}
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {form.media_filename || form.media_url}
                      </span>
                      <button
                        type="button"
                        onClick={clearMedia}
                        className="text-muted-foreground hover:text-destructive transition-colors"
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
                        className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        )}
                        <p className="text-xs text-muted-foreground text-center">
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
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
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
                        className="text-sm"
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
            <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
            <Input
              placeholder="Internal note about this template"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                form.is_default ? 'bg-primary border-primary' : 'border-input'
              )}
              onClick={() => set('is_default', !form.is_default)}
            >
              {form.is_default && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span className="text-sm">Set as default template</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || uploading || !form.name.trim() || !form.content.trim()}
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold">Personal WA Templates</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Saved messages — no Meta approval required
        </p>
      </div>

      {/* Search & Action Row */}
      <div className="px-4 py-2 border-b border-border shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search templates\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0 px-2 sm:px-3" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Template</span>
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-sm">{search ? 'No matching templates' : 'No templates yet'}</p>
            {!search && (
              <Button variant="outline" size="sm" onClick={openCreate}>
                Create your first template
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
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
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <div className="group px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-medium truncate">{t.name}</span>
            {t.is_default && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
            {t.media_type && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 gap-0.5 flex items-center">
                {t.media_type === 'image' && <ImageIcon className="h-2.5 w-2.5" />}
                {t.media_type === 'video' && <Video className="h-2.5 w-2.5" />}
                {t.media_type === 'document' && <FileIcon className="h-2.5 w-2.5" />}
                {t.media_type}
              </Badge>
            )}
          </div>
          {t.header_text && (
            <p className="text-xs text-muted-foreground font-medium mb-0.5 truncate">
              {t.header_text}
            </p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {t.content}
          </p>
          {t.footer_text && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate italic">
              {t.footer_text}
            </p>
          )}
          {placeholders.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {placeholders.map((p) => (
                <Badge key={p} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            title="Edit template"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete template"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/60">
        {t.usage_count > 0 && <span>Used {t.usage_count}\xd7</span>}
        {!t.is_active && (
          <Badge variant="outline" className="text-[10px] py-0 px-1 h-3.5 border-muted-foreground/30">
            Inactive
          </Badge>
        )}
      </div>
    </div>
  );
}
