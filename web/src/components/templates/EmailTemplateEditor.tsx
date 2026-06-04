'use client';

import React, { useState, useEffect, useRef, ChangeEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Check, Eye, ChevronDown,
  LayoutTemplate, Code, AlignLeft, Loader2,
  Smartphone, Monitor, Tablet, Upload, X,
  GalleryHorizontalEnd, Info, Paperclip, Send, CheckCircle, AlertCircle, Settings
} from 'lucide-react';
import ReadyToUseTemplates from './ReadyToUseTemplates';
import HtmlEmailEditor from './HtmlEmailEditor';
import DragDropEmailEditor from './DragDropEmailEditor';
import EmailPreview from './EmailPreview';

// ── Types ─────────────────────────────────────────────────────────────────────

type EditorMode = 'dragdrop' | 'simple' | 'html';
type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface TemplateAttachment {
  filename: string;
  url: string;
  contentType: string;
  size: number; // bytes
}

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
  attachments?: TemplateAttachment[];
}

interface EmailTemplateEditorProps {
  mode: 'create' | 'edit';
  initialTemplate?: Template;
  onBack?: () => void;
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
    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group cursor-pointer max-w-full">
      <span className="text-sm sm:text-lg font-semibold text-gray-900 truncate max-w-[120px] xs:max-w-[200px] sm:max-w-xs">{name || 'Untitled template'}</span>
      <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EmailTemplateEditor({ mode, initialTemplate, onBack }: EmailTemplateEditorProps) {
  const router = useRouter();

  const [activeTab, setActiveTab]     = useState<'editor' | 'templates'>('editor');
  const [mobileSubTab, setMobileSubTab] = useState<'content' | 'preview' | 'details'>('content');
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

  // Test email send (in preview modal)
  const [testEmailAddr, setTestEmailAddr]     = useState('');
  const [testProvider, setTestProvider]       = useState<'google' | 'microsoft' | 'custom_smtp'>('google');
  const [sendingTest, setSendingTest]         = useState(false);
  const [testResult, setTestResult]           = useState<{ ok: boolean; message: string } | null>(null);

  const fileInputRef           = useRef<HTMLInputElement>(null);
  const attachmentInputRef     = useRef<HTMLInputElement>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

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
      attachments: [],
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

  // ── Attachment upload ──────────────────────────────────────────────────────

  const handleAttachmentUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    if (files.length === 0) return;

    setAttachmentUploading(true);
    setError('');

    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          setError(`"${file.name}" exceeds the 20 MB limit.`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/campaigns/email-templates/upload-attachment', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || `Failed to upload "${file.name}"`);
          continue;
        }
        const data = await res.json();
        const url = data.url || data.data?.url;
        if (url) {
          const attachment: TemplateAttachment = {
            filename: file.name,
            url,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          };
          setTemplate(prev => ({
            ...prev,
            attachments: [...(prev.attachments ?? []), attachment],
          }));
        }
      }
    } finally {
      setAttachmentUploading(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const removeAttachment = (url: string) => {
    setTemplate(prev => ({
      ...prev,
      attachments: (prev.attachments ?? []).filter(a => a.url !== url),
    }));
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
          attachments:    template.attachments ?? [],
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

  // ── Send test email ───────────────────────────────────────────────────────

  const handleSendTest = useCallback(async () => {
    const addr = testEmailAddr.trim();
    if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return;
    const subject = template.subject?.trim();
    const body    = previewHtml?.trim();
    if (!subject || !body) {
      setTestResult({ ok: false, message: 'Add a subject line and email body before sending a test.' });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email-conversations/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider:   testProvider,
          recipients: [{ email: addr, name: 'Test Recipient', company: '' }],
          subject:    `[TEST] ${subject}`,
          body_html:  body,
        }),
      });
      const data = await res.json();
      if (data.success && (data.sent ?? 0) > 0) {
        setTestResult({ ok: true, message: `Test email sent to ${addr}` });
      } else {
        const errMsg = data.errors?.[0]?.error || data.error || data.detail || 'Send failed — check your email account is connected in Settings → Integrations.';
        setTestResult({ ok: false, message: errMsg });
      }
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setSendingTest(false);
    }
  }, [testEmailAddr, testProvider, template.subject, previewHtml]);

  // ── Input / label class helpers ───────────────────────────────────────────

  const inputCls  = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400 transition';
  const labelCls  = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';
  const fieldCls  = 'space-y-1.5';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
           <button
            onClick={() => {
              if (editorMode) {
                setEditorMode(null);
              } else if (onBack) {
                onBack();
              } else {
                router.back();
              }
            }}
             className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col min-w-0">
            <EditableName name={template.name} onChange={(v) => set('name', v)} />
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${template.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-400">{template.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Preview & test */}
          <button
            onClick={() => { setShowPreview(true); setTestResult(null); setTestEmailAddr(''); setTestProvider('google'); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer flex-shrink-0"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Preview & test</span>
          </button>

          {/* Save dropdown */}
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-stretch">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#0B1957] text-white text-xs sm:text-sm font-medium rounded-l-lg sm:rounded-l-xl hover:bg-[#13257e] disabled:opacity-60 transition-all cursor-pointer"
              >
                {saving && <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />}
                Save
              </button>
              <button
                onClick={() => setShowSaveMenu((v) => !v)}
                className="px-1.5 py-1.5 sm:px-2 sm:py-2 bg-[#0B1957] text-white rounded-r-lg sm:rounded-r-xl hover:bg-[#13257e] border-l border-[#1c2c77] transition-all cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {showSaveMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { setShowSaveMenu(false); handleSave(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Save without leaving
                </button>
                <button
                  onClick={() => { set('is_active', !template.is_active); setShowSaveMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
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
        <div className="flex items-center justify-between">
          <div className="flex">
            {(['editor', 'templates'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer ${
                  activeTab === tab
                    ? 'border-[#0B1957] text-[#0B1957]'
                    : 'border-transparent text-gray-500 hover:text-gray-850'
                }`}
              >
                {tab === 'editor' ? 'Editor' : 'Use Template'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile Sub-tabs (Design, Preview, Details) ── */}
      {activeTab === 'editor' && editorMode && (
        <div className="sm:hidden flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex justify-center">
          <div className="flex items-center bg-gray-200/55 p-1 rounded-xl border border-gray-300/30 w-full max-w-sm shadow-xs">
            <button
              onClick={() => setMobileSubTab('content')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                mobileSubTab === 'content'
                  ? 'bg-white text-[#0B1957] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Design</span>
            </button>
            <button
              onClick={() => setMobileSubTab('preview')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                mobileSubTab === 'preview'
                  ? 'bg-white text-[#0B1957] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setMobileSubTab('details')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                mobileSubTab === 'details'
                  ? 'bg-white text-[#0B1957] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-gray-50">

        {/* ═══════ Editor Tab ═══════ */}
        {activeTab === 'editor' && (
          <>
            {/* Left: Content area */}
            <div className={`w-full sm:w-1/2 flex-1 sm:flex-initial flex flex-col shrink-0 sm:shrink overflow-hidden border-b sm:border-b-0 sm:border-r border-gray-200 ${mobileSubTab === 'content' ? 'flex' : 'hidden sm:flex'}`}>

              {/* Editor mode switcher bar (only when a mode is selected) */}
              {editorMode && (
                <div className="flex-shrink-0 bg-white border-b border-gray-150 px-4 py-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider shrink-0">Editing with:</span>
                  <div className="flex-1 max-w-[240px] xs:max-w-[280px] sm:max-w-xs bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60 flex" onMouseDown={(e) => e.stopPropagation()}>
                    {EDITOR_OPTIONS.map(({ mode: m, icon }) => (
                      <button
                        key={m}
                        onClick={() => { setEditorMode(m); setMountedEditors((prev) => new Set([...prev, m])); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                          editorMode === m
                            ? 'bg-white text-[#0B1957] shadow-xs border border-gray-200/20'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 flex items-center justify-center [&>svg]:!w-3 [&>svg]:!h-3 sm:[&&>svg]:!w-3.5 sm:[&&>svg]:!h-3.5 flex-shrink-0">
                          {icon}
                        </div>
                        <span className="truncate">{m === 'dragdrop' ? 'Drag & Drop' : m === 'simple' ? 'Simple' : 'HTML'}</span>
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
                    <div className="text-center mb-8 hidden sm:block">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <LayoutTemplate className="w-7 h-7 text-blue-500" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-909 mb-2">Design your email</h2>
                      <p className="text-sm text-gray-500">Choose how you'd like to create your email content.</p>
                    </div>

                    <div className="space-y-3">
                      {EDITOR_OPTIONS.map(({ mode: m, label, desc, icon }) => (
                        <button
                          key={m}
                          onClick={() => { setEditorMode(m); setMountedEditors((prev) => new Set([...prev, m])); }}
                          className="w-full flex items-start gap-4 p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-xs text-left transition-all group cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-blue-55 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-0.5">
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
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-202">
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
                              className="px-3 py-1.5 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
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
                          className="w-full px-4 py-3 border border-gray-202 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white resize-y"
                        />
                        <p className="text-xs text-gray-440 mt-1">
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
                <div className="hidden sm:flex flex-shrink-0 items-center gap-3 mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError('')} className="text-red-400 hover:text-red-650 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Settings panel */}
            <aside className={`w-full sm:w-1/2 flex-1 sm:flex-none bg-white overflow-y-auto flex flex-col border-t sm:border-t-0 border-gray-150 ${mobileSubTab !== 'content' ? 'flex' : 'hidden sm:flex'}`}>
              <div className="p-6 space-y-5 flex-1 max-w-2xl mx-auto w-full">
                {/* Details subtab fields */}
                <div className={`space-y-5 ${mobileSubTab === 'details' ? 'block' : 'hidden sm:block'}`}>
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
                       <div className="relative rounded-xl overflow-hidden border border-gray-202">
                        <img src={template.media_url} alt="Preview" className="w-full max-h-32 object-cover" />
                        <button
                          onClick={() => set('media_url', '')}
                          className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-550 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Uploading…' : 'Select a file or drop here'}
                    </button>
                  )}
                  <p className="text-[11px] text-gray-440 mt-1">Format: JPG, PNG, GIF · Max 5 MB</p>
                </div>

                {/* Attachments */}
                <div className={fieldCls}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls + ' mb-0'}>
                      <Paperclip className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                      Attachments
                      <span className="normal-case font-normal tracking-normal text-gray-400 ml-1">(optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={attachmentUploading}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {attachmentUploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Upload className="w-3.5 h-3.5" />}
                      {attachmentUploading ? 'Uploading…' : 'Add file'}
                    </button>
                  </div>

                  {/* Hidden file input — allows any doc type */}
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />

                  {(template.attachments ?? []).length === 0 ? (
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={attachmentUploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach PDF, DOCX, XLSX or other files
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      {(template.attachments ?? []).map((att) => (
                        <div key={att.url} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 group">
                          <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="flex-1 text-xs text-gray-700 truncate">{att.filename}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {att.size < 1024 * 1024
                              ? `${Math.round(att.size / 1024)} KB`
                              : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.url)}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-all flex-shrink-0 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {/* Add more button */}
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={attachmentUploading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        Add another file
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-440 mt-1">PDF, DOCX, XLSX, etc. · Max 20 MB per file · Sent with every email using this template</p>
                </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-100 hidden sm:block" />

                {/* Email Preview */}
                <div className={mobileSubTab === 'preview' ? 'block' : 'hidden sm:block'}>
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
                          className={`p-1.5 rounded-md transition-all cursor-pointer ${device === id ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-400 hover:text-gray-650'}`}
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
                      <div className="border-b border-gray-102 px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">{template.subject}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">from: {template.name}</p>
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
                <div className={`items-center justify-between py-2 ${mobileSubTab === 'details' ? 'flex' : 'hidden sm:flex'}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Template status</p>
                    <p className="text-xs text-gray-400">{template.is_active ? 'Visible and usable in campaigns' : 'Hidden from campaign builder'}</p>
                  </div>
                  <button
                    onClick={() => set('is_active', !template.is_active)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${template.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

              </div>

              {/* Save actions */}
              <div className="hidden sm:block border-t border-gray-100 p-5 max-w-2xl mx-auto w-full">
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0B1957] text-white text-sm font-semibold rounded-xl hover:bg-[#13257e] disabled:opacity-60 transition-all cursor-pointer"
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

      {/* ── Mobile Save Action Bar ── */}
      {activeTab === 'editor' && (
        <div className="sm:hidden flex-shrink-0 bg-white border-t border-gray-250 p-4 flex flex-col gap-3">
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 shadow-xs">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 font-medium">{error}</span>
              <button onClick={() => setError('')} className="text-[#0B1957] hover:text-blue-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Full-screen preview modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6">
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${device === id ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {icon}
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* ── Test email send bar ── */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100 bg-amber-50/70 space-y-2">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 w-full">
                <Send className="w-3.5 h-3.5 shrink-0" />
                Send a test email to verify before using this template
              </p>

              {/* Provider selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-amber-600 font-medium shrink-0">Send via:</span>
                {(
                  [
                    { value: 'google',     label: 'Gmail' },
                    { value: 'microsoft',  label: 'Outlook' },
                    { value: 'custom_smtp', label: 'Custom SMTP' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setTestProvider(value); setTestResult(null); }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                      testProvider === value
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Email input + send */}
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter email address…"
                  value={testEmailAddr}
                  onChange={(e) => { setTestEmailAddr(e.target.value); setTestResult(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendTest(); }}
                  className="flex-1 h-8 px-3 text-sm border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-305 placeholder-gray-400"
                />
                <button
                  onClick={handleSendTest}
                  disabled={
                    sendingTest ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddr.trim()) ||
                    !template.subject?.trim() ||
                    !previewHtml?.trim()
                  }
                  className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
                >
                  {sendingTest
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
                    : <><Send className="w-3 h-3" /> Send Test</>}
                </button>
              </div>

              {testResult && (
                <div className={`flex items-start gap-1.5 text-xs rounded-lg px-3 py-2 ${
                  testResult.ok
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {testResult.ok
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className={`mx-auto bg-white rounded-xl shadow-xs transition-all duration-300 ${device === 'mobile' ? 'max-w-[375px]' : device === 'tablet' ? 'max-w-[768px]' : 'max-w-full'}`}>
                <EmailPreview htmlContent={previewHtml} subject={template.subject} showDeviceSelector={false} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
