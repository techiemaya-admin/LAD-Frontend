'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Bold, Italic, Strikethrough, Code, Plus, Trash2,
  Upload, FileIcon, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, Phone, Globe, MessageSquare, Play,
} from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ── Types ────────────────────────────────────────────────────────────────────

type Category  = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type MediaType = 'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

interface TemplateButton {
  id:      string;
  type:    ButtonType;
  text:    string;
  url:     string;
  phone:   string;
  urlType: 'static' | 'dynamic';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en',    label: 'English' },
  { code: 'ar',    label: 'Arabic' },
  { code: 'hi',    label: 'Hindi' },
  { code: 'ur',    label: 'Urdu' },
  { code: 'fr',    label: 'French' },
  { code: 'es',    label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'de',    label: 'German' },
  { code: 'id',    label: 'Indonesian' },
];

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'MARKETING',      label: 'Marketing',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'UTILITY',        label: 'Utility',        color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { value: 'AUTHENTICATION', label: 'Authentication', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 8); }

function extractVars(text: string): string[] {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  const seen = new Set<string>();
  return matches.map(m => m[1]).filter(v => { if (seen.has(v)) return false; seen.add(v); return true; });
}

/** Render WhatsApp markdown (*bold*, _italic_, ~strike~) to HTML safely */
function renderWAMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g,   '<em>$1</em>')
    .replace(/~([^~\n]+)~/g,   '<s>$1</s>')
    .replace(/`([^`\n]+)`/g,   '<code class="font-mono text-xs bg-slate-100 px-0.5 rounded">$1</code>');
}

function WAText({ text }: { text: string }) {
  if (!text) return <span className="text-slate-400 italic text-xs">Body text appears here...</span>;
  return (
    <>
      {text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          <span dangerouslySetInnerHTML={{ __html: renderWAMarkdown(line) }} />
        </React.Fragment>
      ))}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarBtn({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-[#64748B] hover:bg-white hover:text-[#1E293B] hover:shadow-sm transition-all"
    >
      {icon}
    </button>
  );
}

function ButtonRow({
  btn, onChange, onRemove,
}: {
  btn: TemplateButton;
  onChange: (p: Partial<TemplateButton>) => void;
  onRemove: () => void;
}) {
  const typeLabel =
    btn.type === 'QUICK_REPLY' ? 'Quick reply' :
    btn.type === 'URL'         ? 'Visit website' : 'Call phone';

  return (
    <div className="p-3 border border-[#E2E8F0] rounded-lg space-y-2 bg-[#FAFBFC]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#64748B] w-24 shrink-0">{typeLabel}</span>
        <span className="text-xs text-[#94A3B8] shrink-0">Button text</span>
        <input
          value={btn.text}
          onChange={e => onChange({ text: e.target.value })}
          placeholder="Button label"
          maxLength={25}
          className="flex-1 px-2 py-1.5 border border-[#E2E8F0] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#0b1957]/30 bg-white"
        />
        <span className="text-[10px] text-[#94A3B8] shrink-0">{btn.text.length}/25</span>
        <button type="button" onClick={onRemove} className="text-[#94A3B8] hover:text-red-500 p-1 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {btn.type === 'URL' && (
        <div className="flex items-center gap-2 pl-24 flex-wrap">
          <span className="text-xs text-[#94A3B8] shrink-0">URL type</span>
          <select
            value={btn.urlType}
            onChange={e => onChange({ urlType: e.target.value as 'static' | 'dynamic' })}
            className="px-2 py-1 border border-[#E2E8F0] rounded text-xs bg-white focus:outline-none"
          >
            <option value="static">Static</option>
            <option value="dynamic">Dynamic</option>
          </select>
          <span className="text-xs text-[#94A3B8] shrink-0">Website URL</span>
          <input
            type="url"
            value={btn.url}
            onChange={e => onChange({ url: e.target.value })}
            placeholder="https://example.com"
            className="flex-1 min-w-0 px-2 py-1.5 border border-[#E2E8F0] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#0b1957]/30 bg-white"
          />
          <span className="text-[10px] text-[#94A3B8] shrink-0">{btn.url.length}/2000</span>
        </div>
      )}

      {btn.type === 'PHONE_NUMBER' && (
        <div className="flex items-center gap-2 pl-24">
          <span className="text-xs text-[#94A3B8] shrink-0">Phone number</span>
          <input
            value={btn.phone}
            onChange={e => onChange({ phone: e.target.value })}
            placeholder="+971501234567"
            className="flex-1 px-2 py-1.5 border border-[#E2E8F0] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#0b1957]/30 bg-white"
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WhatsAppTemplateCreatePage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [name,     setName]     = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState<Category>('MARKETING');

  // Header / media
  const [mediaType,       setMediaType]       = useState<MediaType>('NONE');
  const [headerText,      setHeaderText]       = useState('');
  const [headerVarExample,setHeaderVarExample] = useState('');
  const [mediaHandle,     setMediaHandle]     = useState('');
  const [mediaFileName,   setMediaFileName]   = useState('');
  const [uploadStatus,    setUploadStatus]    = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadError,     setUploadError]     = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Body
  const [bodyText,     setBodyText]     = useState('');
  const [bodyExamples, setBodyExamples] = useState<Record<string, string>>({});
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Footer
  const [footerText, setFooterText] = useState('');

  // Buttons
  const [buttons,        setButtons]        = useState<TemplateButton[]>([]);
  const [showBtnMenu,    setShowBtnMenu]    = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState<{ success: boolean; message: string } | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 512);

  const bodyVars      = useMemo(() => extractVars(bodyText),  [bodyText]);
  const headerVars    = useMemo(() => extractVars(headerText), [headerText]);
  const isMediaHeader = mediaType !== 'NONE';
  const categoryInfo  = CATEGORIES.find(c => c.value === category)!;

  const varDensityWarning = useMemo(() => {
    if (bodyVars.length === 0) return null;
    const stripped   = bodyText.replace(/\{\{\d+\}\}/g, '').trim();
    const wordCount  = stripped.split(/\s+/).filter(Boolean).length;
    const minWords   = bodyVars.length * 3;
    if (wordCount < minWords) {
      return `${wordCount} word${wordCount !== 1 ? 's' : ''} for ${bodyVars.length} variable${bodyVars.length !== 1 ? 's' : ''}. Meta requires ≥${minWords} surrounding words.`;
    }
    return null;
  }, [bodyText, bodyVars]);

  // ── Formatting toolbar ─────────────────────────────────────────────────────
  const wrapSelection = useCallback((open: string, close: string) => {
    const ta = bodyTextareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = bodyText.slice(s, e);
    const next = bodyText.slice(0, s) + open + sel + close + bodyText.slice(e);
    setBodyText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + open.length, s + open.length + sel.length);
    });
  }, [bodyText]);

  const insertBodyVar = useCallback(() => {
    const ta = bodyTextareaRef.current;
    const nextNum = bodyVars.length > 0 ? Math.max(...bodyVars.map(Number)) + 1 : 1;
    const tag = `{{${nextNum}}}`;
    const pos = ta?.selectionStart ?? bodyText.length;
    const next = bodyText.slice(0, pos) + tag + bodyText.slice(pos);
    setBodyText(next);
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.setSelectionRange(pos + tag.length, pos + tag.length); }
    });
  }, [bodyText, bodyVars]);

  // ── Media upload ───────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('uploading');
    setUploadError('');
    setMediaHandle('');
    setMediaFileName(file.name);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const res = await fetchWithTenant(
        '/api/whatsapp-conversations/conversations/templates/upload-media?channel=waba',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_base64: base64, filename: file.name, content_type: file.type }),
        }
      );
      const data = await res.json();
      if (data.success && data.media_id) {
        setMediaHandle(data.media_id);
        setUploadStatus('done');
      } else {
        const raw = data.error || data.detail || 'Upload failed';
        setUploadError(typeof raw === 'string' ? raw : JSON.stringify(raw));
        setUploadStatus('error');
      }
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed');
      setUploadStatus('error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Build Meta components ──────────────────────────────────────────────────
  const buildComponents = useCallback(() => {
    const comps: object[] = [];

    // Header
    if (isMediaHeader && mediaHandle) {
      comps.push({ type: 'HEADER', format: mediaType, example: { header_handle: [mediaHandle] } });
    } else if (!isMediaHeader && headerText.trim()) {
      const comp: any = { type: 'HEADER', format: 'TEXT', text: headerText };
      if (headerVars.length > 0 && headerVarExample) comp.example = { header_text: [headerVarExample] };
      comps.push(comp);
    }

    // Body (required)
    if (bodyText.trim()) {
      const comp: any = { type: 'BODY', text: bodyText };
      if (bodyVars.length > 0) comp.example = { body_text: [bodyVars.map(v => bodyExamples[v] || `example${v}`)] };
      comps.push(comp);
    }

    // Footer
    if (footerText.trim()) comps.push({ type: 'FOOTER', text: footerText });

    // Buttons
    const validBtns = buttons.filter(b => b.text.trim());
    if (validBtns.length > 0) {
      comps.push({
        type: 'BUTTONS',
        buttons: validBtns.map(b => {
          if (b.type === 'QUICK_REPLY')  return { type: 'QUICK_REPLY', text: b.text };
          if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone };
          return { type: 'URL', text: b.text, url: b.url };
        }),
      });
    }
    return comps;
  }, [isMediaHeader, mediaType, mediaHandle, headerText, headerVars, headerVarExample,
      bodyText, bodyVars, bodyExamples, footerText, buttons]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const canSubmit = useMemo(() => {
    if (!safeName || !bodyText.trim()) return false;
    if (bodyVars.some(v => !bodyExamples[v]?.trim())) return false;
    if (isMediaHeader && !mediaHandle) return false;
    if (uploadStatus === 'uploading') return false;
    if (!isMediaHeader && headerText && headerVars.length > 0 && !headerVarExample.trim()) return false;
    if (buttons.some(b => b.type === 'URL' && !b.url.trim())) return false;
    if (buttons.some(b => b.type === 'PHONE_NUMBER' && !b.phone.trim())) return false;
    if (varDensityWarning) return false;
    return true;
  }, [safeName, bodyText, bodyVars, bodyExamples, isMediaHeader, mediaHandle, uploadStatus,
      headerText, headerVars, headerVarExample, buttons, varDensityWarning]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetchWithTenant(
        '/api/whatsapp-conversations/conversations/templates?channel=waba',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: safeName, language, category, components: buildComponents() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: `"${safeName}" submitted — status: ${data.status ?? 'PENDING'}` });
      } else {
        setResult({ success: false, message: data.error || 'Meta rejected the template.' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err?.message ?? 'Unexpected error.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Preview derived ─────────────────────────────────────────────────────────
  const previewBody = useMemo(() => {
    let text = bodyText;
    bodyVars.forEach(v => {
      text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), bodyExamples[v] || `[example${v}]`);
    });
    return text;
  }, [bodyText, bodyVars, bodyExamples]);

  const previewHeaderText = useMemo(() => {
    if (isMediaHeader) return null;
    return headerText.replace(/\{\{1\}\}/g, headerVarExample || '[example]');
  }, [isMediaHeader, headerText, headerVarExample]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724]" onClick={() => setShowBtnMenu(false)}>

      {/* ── Sticky header bar — back only ── */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <button
          onClick={() => router.push('/campaigns/templates')}
          className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-5 w-px bg-[#E2E8F0]" />
        <span className="text-sm font-semibold text-[#1E293B]">Create WhatsApp template</span>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex">

        {/* ─── Left: Form ─── */}
        <div className="flex-1 p-6 space-y-4 min-w-0 max-w-4xl">

          {/* ── Template name & language section ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FE]">
              <h2 className="text-base font-semibold text-[#1E293B]">Template name and language</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Name + Language row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Name your template</label>
                  <div className="relative">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. welcome_message"
                      maxLength={512}
                      className="w-full px-3 py-2.5 pr-16 border border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] pointer-events-none">{name.length}/512</span>
                  </div>
                  {name && safeName !== name.toLowerCase().replace(/\s+/g, '_') && (
                    <p className="text-[11px] text-amber-600 mt-1">Will be saved as: <span className="font-mono font-semibold">{safeName}</span></p>
                  )}
                  {safeName && (
                    <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">{safeName || 'template_name'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Select language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Category + Submit row */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-medium text-[#1E293B] mb-2">Category</p>
                  <div className="flex gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`text-sm font-semibold px-4 py-2 rounded-full border transition-all ${
                          category === c.value
                            ? 'bg-[#0b1957] text-white border-[#0b1957] shadow-[0_2px_8px_rgba(11,25,87,0.25)]'
                            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0b1957]/40 hover:text-[#1E293B]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {result && (
                    <div className={`flex items-center gap-2 text-sm max-w-[260px] ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.success
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                        : <AlertCircle  className="w-4 h-4 shrink-0" />}
                      <span className="text-xs line-clamp-2">{result.message}</span>
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0b1957] text-white rounded-xl font-semibold text-sm hover:bg-[#0a1540] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] transition-all"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                      : 'Submit to Meta'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Content section ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FE]">
              <h2 className="text-base font-semibold text-[#1E293B]">Content</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Add a header, body and footer for your template. Cloud API hosted by Meta will review variables and content.
              </p>
            </div>

            <div className="p-6 space-y-6">

              {/* Variable type + Media sample row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Type of variable
                    <span className="ml-1.5 text-[#94A3B8] text-xs">ⓘ</span>
                  </label>
                  <select className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]">
                    <option>Number</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Media sample
                    <span className="ml-1 text-[#94A3B8] font-normal text-xs">· Optional</span>
                  </label>
                  <select
                    value={mediaType}
                    onChange={e => {
                      setMediaType(e.target.value as MediaType);
                      setMediaHandle('');
                      setMediaFileName('');
                      setUploadStatus('idle');
                      setUploadError('');
                    }}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"
                  >
                    <option value="NONE">None</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
              </div>

              {/* File upload area */}
              {isMediaHeader && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={
                      mediaType === 'IMAGE'    ? 'image/jpeg,image/png,image/webp' :
                      mediaType === 'VIDEO'    ? 'video/mp4,video/3gp' :
                      'application/pdf,.doc,.docx'
                    }
                    onChange={handleFileChange}
                  />
                  {uploadStatus === 'done' ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800 truncate">{mediaFileName}</p>
                        <p className="text-xs text-green-600 mt-0.5">Uploaded to Meta successfully</p>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-green-700 underline underline-offset-2 hover:text-green-800 shrink-0"
                      >
                        Replace file
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadStatus === 'uploading'}
                      className="w-full border-2 border-dashed border-[#E2E8F0] hover:border-[#0b1957]/40 rounded-xl p-8 flex flex-col items-center gap-3 transition-colors group disabled:cursor-not-allowed bg-[#FAFBFC] hover:bg-[#F0F4FF]"
                    >
                      {uploadStatus === 'uploading' ? (
                        <>
                          <Loader2 className="w-8 h-8 text-[#0b1957] animate-spin" />
                          <p className="text-sm font-medium text-[#64748B]">Uploading to Meta…</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-[#0b1957]/5 group-hover:bg-[#0b1957]/10 flex items-center justify-center transition-colors">
                            <Upload className="w-6 h-6 text-[#0b1957]/60 group-hover:text-[#0b1957]" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-[#1E293B] group-hover:text-[#0b1957]">
                              Choose {mediaType.charAt(0) + mediaType.slice(1).toLowerCase()} file
                            </p>
                            <p className="text-xs text-[#94A3B8] mt-1">
                              {mediaType === 'IMAGE'    && 'JPG, PNG or WebP · Max 5MB'}
                              {mediaType === 'VIDEO'    && 'MP4 or 3GP · Max 16MB'}
                              {mediaType === 'DOCUMENT' && 'PDF, DOC or DOCX · Max 100MB'}
                            </p>
                          </div>
                        </>
                      )}
                    </button>
                  )}
                  {uploadStatus === 'error' && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
                    </div>
                  )}
                </div>
              )}

              {/* Header text */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Header
                  <span className="ml-1 text-[#94A3B8] font-normal text-xs">· Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={headerText}
                    onChange={e => setHeaderText(e.target.value)}
                    placeholder={
                      isMediaHeader
                        ? 'Text header not available when media is selected'
                        : 'Add a short line of text to the header of your message'
                    }
                    disabled={isMediaHeader}
                    maxLength={60}
                    className="w-full px-3 py-2.5 pr-16 border border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957] disabled:bg-[#F8F9FE] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] pointer-events-none">
                    {headerText.length}/60
                  </span>
                </div>
                {headerVars.length > 0 && !isMediaHeader && (
                  <div className="mt-2">
                    <label className="text-xs text-[#64748B] mb-1 block">
                      Example for <code className="font-mono bg-slate-100 px-1 rounded">{'{{1}}'}</code>
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      value={headerVarExample}
                      onChange={e => setHeaderVarExample(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"
                    />
                  </div>
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">
                    Body <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-[#94A3B8]">{bodyText.length}/1028</span>
                </div>

                {/* Formatting toolbar */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 border border-b-0 border-[#E2E8F0] rounded-t-lg bg-[#F8F9FE]">
                  <ToolbarBtn icon={<Bold        className="w-3.5 h-3.5" />} onClick={() => wrapSelection('*', '*')} title="Bold (*text*)" />
                  <ToolbarBtn icon={<Italic      className="w-3.5 h-3.5" />} onClick={() => wrapSelection('_', '_')} title="Italic (_text_)" />
                  <ToolbarBtn icon={<Strikethrough className="w-3.5 h-3.5" />} onClick={() => wrapSelection('~', '~')} title="Strikethrough (~text~)" />
                  <ToolbarBtn icon={<Code        className="w-3.5 h-3.5" />} onClick={() => wrapSelection('`', '`')} title="Monospace (`text`)" />
                  <div className="w-px h-4 bg-[#E2E8F0] mx-1.5" />
                  <button
                    type="button"
                    onClick={insertBodyVar}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0b1957] hover:bg-[#0b1957]/8 rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add variable
                  </button>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  rows={6}
                  maxLength={1028}
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  placeholder="Hi {{1}}, your appointment on {{2}} is confirmed."
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-b-lg text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957] resize-none bg-white font-sans"
                />
                {varDensityWarning && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {varDensityWarning}
                  </div>
                )}
              </div>

              {/* Variable samples */}
              {bodyVars.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#1E293B] mb-1">Variable samples</h3>
                  <p className="text-xs text-[#64748B] mb-3">
                    Include samples of all variables in your message to help Meta review your template.
                    Remember not to include any customer information.
                  </p>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 px-4 py-2.5 bg-[#F8F9FE] border-b border-[#E2E8F0]">
                      <span className="text-xs font-semibold text-[#64748B]">Body</span>
                      <span className="text-xs font-semibold text-[#64748B]">Sample value <span className="text-red-500">*</span></span>
                    </div>
                    {bodyVars.map(v => (
                      <div key={v} className="grid grid-cols-2 px-4 py-3 border-b border-[#E2E8F0] last:border-0 items-center gap-4">
                        <span className="text-sm font-mono text-[#64748B]">{`{{${v}}}`}</span>
                        <input
                          value={bodyExamples[v] || ''}
                          onChange={e => setBodyExamples(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder={`Sample for {{${v}}}`}
                          className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0b1957]/30 focus:border-[#0b1957] bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Footer
                  <span className="ml-1 text-[#94A3B8] font-normal text-xs">· Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    placeholder="Add a short line of text to the bottom of your message"
                    maxLength={60}
                    className="w-full px-3 py-2.5 pr-16 border border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] pointer-events-none">
                    {footerText.length}/60
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Buttons section ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FE]">
              <h2 className="text-base font-semibold text-[#1E293B]">
                Buttons
                <span className="ml-1 text-[#94A3B8] font-normal text-sm">· Optional</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Create buttons that let customers respond to your message or take action. You can add up to 3 buttons.
              </p>
            </div>

            <div className="p-6 space-y-3">
              {buttons.map(btn => (
                <ButtonRow
                  key={btn.id}
                  btn={btn}
                  onChange={patch => setButtons(prev => prev.map(b => b.id === btn.id ? { ...b, ...patch } : b))}
                  onRemove={() => setButtons(prev => prev.filter(b => b.id !== btn.id))}
                />
              ))}

              {buttons.length < 3 && (
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setShowBtnMenu(v => !v)}
                    className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#1E293B] hover:border-[#0b1957]/40 hover:bg-[#F8F9FE] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add button <ChevronDown className="w-4 h-4 ml-0.5" />
                  </button>
                  {showBtnMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-10 overflow-hidden min-w-52">
                      {[
                        { type: 'QUICK_REPLY'   as ButtonType, label: 'Quick reply',        desc: 'Pre-set response button'  },
                        { type: 'URL'           as ButtonType, label: 'Visit website',       desc: 'Link to a URL'            },
                        { type: 'PHONE_NUMBER'  as ButtonType, label: 'Call phone number',   desc: 'Dial a phone number'      },
                      ].map(opt => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            setButtons(prev => [...prev, { id: uid(), type: opt.type, text: '', url: '', phone: '', urlType: 'static' }]);
                            setShowBtnMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-[#F8F9FE] transition-colors border-b border-[#E2E8F0] last:border-0"
                        >
                          <p className="text-sm font-semibold text-[#1E293B]">{opt.label}</p>
                          <p className="text-xs text-[#64748B] mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right: Preview (sticky) ─── */}
        <div className="w-[340px] shrink-0 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto border-l border-[#E2E8F0] bg-white">
          <div className="p-5">
            {/* Preview header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#1E293B]">Template preview</h3>
              <div className="flex items-center gap-1 text-xs text-[#64748B]">
                <Play className="w-3 h-3" />
                <span>Live</span>
              </div>
            </div>

            {/* WhatsApp phone mock */}
            <div className="mx-auto max-w-[270px]">
              {/* WA chat background */}
              <div className="bg-[#e5ddd5] rounded-2xl p-3 min-h-[300px]">
                {/* Chat header bar */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black/10">
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B] leading-none">Your Business</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Online</p>
                  </div>
                </div>

                {/* Message bubble */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-[230px] mx-auto">
                  {/* Media / text header */}
                  {isMediaHeader && (
                    <div className="h-28 bg-slate-100 flex items-center justify-center border-b border-slate-200">
                      {uploadStatus === 'done' ? (
                        <div className="text-center px-2">
                          <FileIcon className="w-8 h-8 mx-auto text-slate-500 mb-1" />
                          <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{mediaFileName}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-2xl block mb-1">
                            {mediaType === 'IMAGE' ? '🖼️' : mediaType === 'VIDEO' ? '🎥' : '📄'}
                          </span>
                          <p className="text-[10px] text-slate-400">No {mediaType.toLowerCase()} uploaded</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!isMediaHeader && previewHeaderText && (
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <p className="text-sm font-bold text-[#1E293B]">{previewHeaderText}</p>
                    </div>
                  )}

                  {/* Body */}
                  <div className="px-3 py-2.5">
                    <p className="text-sm text-[#1E293B] leading-relaxed">
                      <WAText text={previewBody} />
                    </p>
                  </div>

                  {/* Footer */}
                  {footerText && (
                    <div className="px-3 pb-2">
                      <p className="text-xs text-slate-400">{footerText}</p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="px-3 pb-2 flex justify-end">
                    <span className="text-[10px] text-slate-400">09:33 ✓✓</span>
                  </div>

                  {/* Buttons */}
                  {buttons.filter(b => b.text.trim()).length > 0 && (
                    <div className="border-t border-slate-100">
                      {buttons.filter(b => b.text.trim()).map(b => (
                        <div
                          key={b.id}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-[#0b85eb] font-semibold border-b border-slate-100 last:border-0"
                        >
                          {b.type === 'URL'          && <Globe  className="w-3 h-3" />}
                          {b.type === 'PHONE_NUMBER' && <Phone  className="w-3 h-3" />}
                          {b.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submission summary card */}
            {(safeName || bodyText) && (
              <div className="mt-5 p-4 bg-[#F8F9FE] rounded-xl border border-[#E2E8F0] space-y-2">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Summary</p>
                {safeName && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-[#94A3B8]">Name</span>
                    <span className="text-xs font-mono font-semibold text-[#1E293B] truncate max-w-[160px] text-right">{safeName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Language</span>
                  <span className="text-xs text-[#1E293B]">{LANGUAGES.find(l => l.code === language)?.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Category</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoryInfo.color}`}>
                    {category}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-[#94A3B8]">Components</span>
                  <span className="text-xs text-[#1E293B] text-right">
                    {buildComponents().map((c: any) => c.type).join(', ') || '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
