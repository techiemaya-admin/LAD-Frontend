'use client';

import { useState, useEffect, useRef, ChangeEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Check, Eye, ChevronDown,
  LayoutTemplate, Code, AlignLeft, Loader2,
  Smartphone, Monitor, Tablet, Upload, X,
  GalleryHorizontalEnd, Info,
} from 'lucide-react';
import ReadyToUseTemplates from './ReadyToUseTemplates';
import HtmlEmailEditor from './HtmlEmailEditor';
import DragDropEmailEditor from './DragDropEmailEditor';
import EmailPreview from './EmailPreview';

// ── Types ─────────────────────────────────────────────────────────────────────

type EditorMode = 'dragdrop' | 'simple' | 'html';
type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface Template {
  id?: string;
  name: string;
  subject: string;
  body: string;
  body_html?: string;
  content_format?: 'plain_text' | 'html' | 'markdown';
  category?: string;
  description?: string;
  is_active?: boolean;
  media_url?: string;
  media_alt_text?: string;
}

interface EmailTemplateEditorProps {
  mode: 'create' | 'edit';
  initialTemplate?: Template;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'email_send',     label: 'Initial Email' },
  { value: 'email_followup', label: 'Follow-up Email' },
];

const EDITOR_OPTIONS: { mode: EditorMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    mode: 'dragdrop',
    label: 'Drag & drop editor',
    desc: 'Build emails with reusable visual blocks.',
    icon: <LayoutTemplate className="w-5 h-5" />,
  },
  {
    mode: 'simple',
    label: 'Simple editor',
    desc: 'Write plain-text with images and personalization.',
    icon: <AlignLeft className="w-5 h-5" />,
  },
  {
    mode: 'html',
    label: 'HTML custom code',
    desc: 'Full HTML control with live preview.',
    icon: <Code className="w-5 h-5" />,
  },
];

// ── Inline editable template name ─────────────────────────────────────────────

function EditableName({ name, onChange }: { name: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setVal(name); }, [name]);

  const commit = () => {
    setEditing(false);
    if (val.trim()) onChange(val.trim());
    else setVal(name);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={ref}
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setVal(name); } }}
          className="text-lg font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-64"
        />
        <button onClick={commit} className="text-blue-600 hover:text-blue-700">
          <Check className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group">
      <span className="text-lg font-semibold text-gray-900">{name || 'Untitled template'}</span>
      <Pencil className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EmailTemplateEditor({ mode, initialTemplate }: EmailTemplateEditorProps) {
  const router = useRouter();

  const [activeTab, setActiveTab]     = useState<'editor' | 'templates'>('editor');
  const [editorMode, setEditorMode]   = useState<EditorMode | null>(
    initialTemplate?.content_format === 'html' ? 'html' : null
  );
  // Track which editors have ever been opened — once mounted they stay in DOM
  // so internal state (e.g. DragDropEmailEditor blocks) is preserved across switches.
  const [mountedEditors, setMountedEditors] = useState<Set<EditorMode>>(
    () => new Set(initialTemplate?.content_format === 'html' ? (['html'] as EditorMode[]) : [])
  );
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [device, setDevice]           = useState<DeviceType>('desktop');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [uploading, setUploading]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<Template>(
    initialTemplate ?? {
      name: 'New template',
      subject: '',
      body: '',
      body_html: '',
      content_format: 'plain_text',
      category: '',
      description: '',
      is_active: true,
      media_url: '',
      media_alt_text: '',
    }
  );

  // Close menus on outside click
  useEffect(() => {
    const handler = () => { setShowModeMenu(false); setShowSaveMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof Template>(key: K, val: Template[K]) => {
    setTemplate((p) => ({ ...p, [key]: val }));
  }, []);

  const handleInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTemplate((p) => ({ ...p, [name]: value }));
  };

  // ── Media upload ──────────────────────────────────────────────────────────

  const handleMediaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File size must be less than 5 MB'); return; }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/campaigns/email-templates/upload', { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = data.url || data.data?.url;
      set('media_url', url);
      // Persist to localStorage so HtmlEmailEditor can list it
      if (url) {
        try {
          const stored = JSON.parse(localStorage.getItem('email_media_uploads') || '[]');
          const entry = { url, name: file.name, uploadedAt: new Date().toISOString() };
          localStorage.setItem('email_media_uploads', JSON.stringify([entry, ...stored.filter((s: any) => s.url !== url)].slice(0, 50)));
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async (andRedirect = true) => {
    const hasContent = editorMode === 'html' || editorMode === 'dragdrop'
      ? (template.body_html || '').trim().length > 0
      : template.body.trim().length > 0;

    if (!template.name.trim() || !template.subject.trim() || !hasContent) {
      setError('Please fill in Template Name, Subject, and email content.');
      return;
    }
    if (!template.category?.trim()) {
      setError('Please select a category.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const url    = mode === 'create' ? '/api/campaigns/email-templates' : `/api/campaigns/email-templates/${template.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const isHtmlMode = editorMode === 'html' || editorMode === 'dragdrop';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name:           template.name,
          subject:        template.subject,
          body:           isHtmlMode
                            ? (template.body || (template.body_html || '').replace(/<[^>]*>/g, '').trim())
                            : template.body,
          body_html:      isHtmlMode ? (template.body_html || null) : null,
          content_format: isHtmlMode ? 'html' : 'plain_text',
          category:       template.category,
          description:    template.description,
          is_active:      template.is_active,
          media_url:      template.media_url || null,
          media_alt_text: template.media_alt_text || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `${res.status} ${res.statusText}`);
      }

      if (andRedirect) router.push('/campaigns/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSaving(false);
    }
  };

  // ── Select a ready-to-use template ────────────────────────────────────────

  const handleSelectTemplate = (t: Template) => {
    setTemplate({ ...t, id: undefined, name: `${t.name} (Copy)` });
    const targetMode: EditorMode = t.content_format === 'html' ? 'html' : 'simple';
    setEditorMode(targetMode);
    setMountedEditors((prev) => new Set([...prev, targetMode]));
    setActiveTab('editor');
  };

  // ── Preview content ───────────────────────────────────────────────────────

  const previewHtml = editorMode === 'html' || editorMode === 'dragdrop'
    ? (template.body_html || '')
    : `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">${(template.body || '').replace(/\n/g, '<br/>')}</p>`;

  // ── Input / label class helpers ───────────────────────────────────────────

  const inputCls  = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400 transition';
  const labelCls  = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';
  const fieldCls  = 'space-y-1.5';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <Link
          href="/campaigns/templates"
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex flex-col min-w-0">
          <EditableName name={template.name} onChange={(v) => set('name', v)} />
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${template.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-400">{template.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Preview & test */}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <Eye className="w-4 h-4" />
            Preview & test
          </button>

          {/* Save dropdown */}
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-stretch">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-l-xl hover:bg-gray-800 disabled:opacity-60 transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
              <button
                onClick={() => setShowSaveMenu((v) => !v)}
                className="px-2 py-2 bg-gray-900 text-white rounded-r-xl hover:bg-gray-800 border-l border-gray-700 transition-all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {showSaveMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { setShowSaveMenu(false); handleSave(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Save without leaving
                </button>
                <button
                  onClick={() => { set('is_active', !template.is_active); setShowSaveMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {template.is_active ? 'Deactivate template' : 'Activate template'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
        <div className="flex">
          {(['editor', 'templates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab === 'editor' ? 'Editor' : 'Use Template'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ═══════ Editor Tab ═══════ */}
        {activeTab === 'editor' && (
          <>
            {/* Left: Content area — 50% */}
            <div className="w-1/2 flex flex-col overflow-hidden border-r border-gray-200">

              {/* Editor mode switcher bar (only when a mode is selected) */}
              {editorMode && (
                <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 bg-white border-b border-gray-100">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Editing with:</span>
                  <div className="flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
                    {EDITOR_OPTIONS.map(({ mode: m, label, icon }) => (
                      <button
                        key={m}
                        onClick={() => { setEditorMode(m); setMountedEditors((prev) => new Set([...prev, m])); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          editorMode === m
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor content */}
              <div className="flex-1 overflow-auto p-6">
                {!editorMode ? (
                  /* ── Choose editor type ── */
                  <div className="max-w-lg mx-auto pt-8">
                    <div className="text-center mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <LayoutTemplate className="w-7 h-7 text-blue-500" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Design your email</h2>
                      <p className="text-sm text-gray-500">Choose how you'd like to create your email content.</p>
                    </div>

                    <div className="space-y-3">
                      {EDITOR_OPTIONS.map(({ mode: m, label, desc, icon }) => (
                        <button
                          key={m}
                          onClick={() => { setEditorMode(m); setMountedEditors((prev) => new Set([...prev, m])); }}
                          className="w-full flex items-start gap-4 p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-md text-left transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-0.5">
                            {icon}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm mb-0.5">{label}</p>
                            <p className="text-xs text-gray-400">{desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                ) : (
                  /* ── Editors: mount-once, toggle visibility to preserve state ── */
                  <div className="min-h-0">

                    {/* Drag & Drop — stays mounted after first open */}
                    {mountedEditors.has('dragdrop') && (
                      <div className={editorMode === 'dragdrop' ? '' : 'hidden'}>
                        <DragDropEmailEditor
                          htmlContent={template.body_html || ''}
                          subject={template.subject}
                          onContentChange={(html) => set('body_html', html)}
                        />
                      </div>
                    )}

                    {/* HTML custom code — stays mounted after first open */}
                    {mountedEditors.has('html') && (
                      <div className={editorMode === 'html' ? '' : 'hidden'}>
                        <HtmlEmailEditor
                          htmlContent={template.body_html || ''}
                          subject={template.subject}
                          onContentChange={(html) => set('body_html', html)}
                        />
                      </div>
                    )}

                    {/* Simple plain-text editor — stays mounted after first open */}
                    {mountedEditors.has('simple') && (
                      <div className={editorMode === 'simple' ? 'space-y-4' : 'hidden'}>
                        {/* Personalisation toolbar */}
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Insert:</span>
                          {[
                            { label: 'First Name', val: '{{first_name}}' },
                            { label: 'Last Name',  val: '{{last_name}}'  },
                            { label: 'Company',    val: '{{company}}'    },
                            { label: 'Title',      val: '{{title}}'      },
                          ].map(({ label, val }) => (
                            <button
                              key={val}
                              onClick={() => set('body', (template.body || '') + val)}
                              className="px-3 py-1.5 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          name="body"
                          value={template.body ?? ''}
                          onChange={handleInput}
                          placeholder={`Hi {{first_name}},\n\nStart writing your email here...\n\nBest regards,\n[Your Name]`}
                          rows={18}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white resize-y"
                        />
                        <p className="text-xs text-gray-400">
                          💡 Use <code className="bg-gray-100 px-1 rounded">{'{{first_name}}'}</code>,{' '}
                          <code className="bg-gray-100 px-1 rounded">{'{{company}}'}</code> etc. for dynamic personalisation
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Error bar */}
              {error && (
                <div className="flex-shrink-0 flex items-center gap-3 mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Settings panel — 50% */}
            <aside className="w-1/2 bg-white overflow-y-auto flex flex-col">
              <div className="p-6 space-y-5 flex-1 max-w-2xl mx-auto w-full">
                {/* Sender / metadata section header */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Template details</p>

                {/* Subject line */}
                <div className={fieldCls}>
                  <label className={labelCls}>
                    Subject line <span className="text-red-400 normal-case font-normal tracking-normal">*</span>
                  </label>
                  <input name="subject" type="text" value={template.subject} onChange={handleInput}
                    placeholder="e.g. Quick question about {{company}}" className={inputCls} />
                  {template.subject.length > 0 && (
                    <p className={`text-[11px] ${template.subject.length > 50 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {template.subject.length}/50 chars — {template.subject.length <= 50 ? 'good length ✓' : 'consider shortening'}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className={fieldCls}>
                  <label className={labelCls}>
                    Category <span className="text-red-400 normal-case font-normal tracking-normal">*</span>
                  </label>
                  <select name="category" value={template.category || ''} onChange={handleInput} className={inputCls}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className={fieldCls}>
                  <label className={labelCls}>Description</label>
                  <textarea name="description" value={template.description ?? ''} onChange={handleInput}
                    placeholder="When should this template be used?" rows={3}
                    className={inputCls + ' resize-none'} />
                </div>

                {/* Media */}
                <div className={fieldCls}>
                  <label className={labelCls}>📸 Header image <span className="normal-case font-normal tracking-normal text-gray-400">(optional)</span></label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />

                  {template.media_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img src={template.media_url} alt="Preview" className="w-full max-h-32 object-cover" />
                        <button
                          onClick={() => set('media_url', '')}
                          className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        name="media_alt_text"
                        value={template.media_alt_text || ''}
                        onChange={handleInput}
                        placeholder="Alt text (for accessibility)"
                        className={inputCls}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Uploading…' : 'Select a file or drop here'}
                    </button>
                  )}
                  <p className="text-[11px] text-gray-400">Format: JPG, PNG, GIF · Max 5 MB</p>
                </div>

                {/* Divider */}
                <hr className="border-gray-100" />

                {/* Email Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Preview</p>
                    {/* Device switcher */}
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                      {([
                        { id: 'mobile',  icon: <Smartphone className="w-3.5 h-3.5" /> },
                        { id: 'tablet',  icon: <Tablet className="w-3.5 h-3.5" />     },
                        { id: 'desktop', icon: <Monitor className="w-3.5 h-3.5" />    },
                      ] as const).map(({ id, icon }) => (
                        <button
                          key={id}
                          onClick={() => setDevice(id)}
                          className={`p-1.5 rounded-md transition-all ${device === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                          title={id}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview frame */}
                  <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${device === 'mobile' ? 'max-w-[380px] mx-auto' : device === 'tablet' ? 'max-w-[600px] mx-auto' : 'w-full'}`}>
                    {/* Subject line preview */}
                    {template.subject && (
                      <div className="border-b border-gray-100 px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">{template.subject}</p>
                        <p className="text-[11px] text-gray-400">from: {template.name}</p>
                      </div>
                    )}
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)', minHeight: '320px' }}>
                      <EmailPreview
                        htmlContent={previewHtml}
                        subject={template.subject}
                        showDeviceSelector={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Template status</p>
                    <p className="text-xs text-gray-400">{template.is_active ? 'Visible and usable in campaigns' : 'Hidden from campaign builder'}</p>
                  </div>
                  <button
                    onClick={() => set('is_active', !template.is_active)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${template.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

              </div>

              {/* Save actions */}
              <div className="border-t border-gray-100 p-5 max-w-2xl mx-auto w-full">
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-60 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : mode === 'create' ? 'Create template' : 'Save changes'}
                </button>
              </div>
            </aside>
          </>
        )}

        {/* ═══════ Use Template Tab ═══════ */}
        {activeTab === 'templates' && (
          <div className="flex-1 overflow-auto p-6">
            <ReadyToUseTemplates onSelectTemplate={handleSelectTemplate} />
          </div>
        )}
      </div>

      {/* ── Full-screen preview modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Email Preview</p>
                {template.subject && <p className="text-xs text-gray-400 mt-0.5">Subject: {template.subject}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {([
                    { id: 'mobile',  icon: <Smartphone className="w-4 h-4" />, label: '375px'  },
                    { id: 'tablet',  icon: <Tablet className="w-4 h-4" />,     label: '768px'  },
                    { id: 'desktop', icon: <Monitor className="w-4 h-4" />,    label: '1200px' },
                  ] as const).map(({ id, icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setDevice(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${device === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {icon}
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className={`mx-auto bg-white rounded-xl shadow-sm transition-all duration-300 ${device === 'mobile' ? 'max-w-[375px]' : device === 'tablet' ? 'max-w-[768px]' : 'max-w-full'}`}>
                <EmailPreview htmlContent={previewHtml} subject={template.subject} showDeviceSelector={false} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
