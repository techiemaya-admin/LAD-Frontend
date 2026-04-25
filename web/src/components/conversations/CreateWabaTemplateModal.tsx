'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Eye, Send, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ── Types ────────────────────────────────────────────────────────────────────

type Category  = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type HeaderFmt = 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

interface TemplateButton {
  id:          string;
  type:        ButtonType;
  text:        string;
  url:         string;   // for URL buttons
  phone:       string;   // for PHONE_NUMBER buttons
}

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

const CATEGORIES: { value: Category; label: string; desc: string }[] = [
  { value: 'MARKETING',       label: 'Marketing',       desc: 'Promotions, offers, announcements' },
  { value: 'UTILITY',         label: 'Utility',         desc: 'Order updates, account info' },
  { value: 'AUTHENTICATION',  label: 'Authentication',  desc: 'OTPs, verification codes' },
];

const HEADER_FORMATS: { value: HeaderFmt; label: string }[] = [
  { value: 'NONE',     label: 'None' },
  { value: 'TEXT',     label: 'Text' },
  { value: 'IMAGE',    label: 'Image' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'VIDEO',    label: 'Video' },
];

// Extract {{N}} variables from a string, ordered by first appearance
function extractVars(text: string): string[] {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  const seen = new Set<string>();
  return matches.map(m => m[1]).filter(v => { if (seen.has(v)) return false; seen.add(v); return true; });
}

function uid() { return Math.random().toString(36).slice(2, 8); }

// Insert {{N}} at cursor position in a textarea
function insertVar(text: string, cursorPos: number, varNum: number): { text: string; cursor: number } {
  const tag = `{{${varNum}}}`;
  return {
    text:   text.slice(0, cursorPos) + tag + text.slice(cursorPos),
    cursor: cursorPos + tag.length,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CreateWabaTemplateModalProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onCreated?:    () => void;  // called after successful submission to refresh template list
}

export function CreateWabaTemplateModal({ open, onOpenChange, onCreated }: CreateWabaTemplateModalProps) {
  // ── Basic info ──────────────────────────────────────────────────────────────
  const [name,     setName]     = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState<Category>('MARKETING');

  // ── Header ──────────────────────────────────────────────────────────────────
  const [headerFmt,      setHeaderFmt]      = useState<HeaderFmt>('NONE');
  const [headerText,     setHeaderText]     = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [headerVarExample, setHeaderVarExample] = useState('');  // example for {{1}} in text header

  // ── Body ────────────────────────────────────────────────────────────────────
  const [bodyText,      setBodyText]      = useState('');
  const [bodyExamples,  setBodyExamples]  = useState<Record<string, string>>({});  // varNum → example

  // ── Footer ──────────────────────────────────────────────────────────────────
  const [footerText, setFooterText] = useState('');

  // ── Buttons ─────────────────────────────────────────────────────────────────
  const [buttons, setButtons] = useState<TemplateButton[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState<'build' | 'preview'>('build');
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState<{ success: boolean; message: string } | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const bodyVars       = useMemo(() => extractVars(bodyText), [bodyText]);
  const headerTextVars = useMemo(() => extractVars(headerText), [headerText]);

  const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons(prev => [...prev, { id: uid(), type: 'QUICK_REPLY', text: '', url: '', phone: '' }]);
  };

  const updateButton = (id: string, patch: Partial<TemplateButton>) =>
    setButtons(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const removeButton = (id: string) =>
    setButtons(prev => prev.filter(b => b.id !== id));

  const insertBodyVar = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const nextNum = bodyVars.length > 0 ? Math.max(...bodyVars.map(Number)) + 1 : 1;
    const { text, cursor } = insertVar(bodyText, el.selectionStart ?? bodyText.length, nextNum);
    setBodyText(text);
    // restore focus + cursor after React re-render
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  }, [bodyText, bodyVars]);

  // ── Build Meta components array ────────────────────────────────────────────
  const buildComponents = useCallback((): object[] => {
    const comps: object[] = [];

    // Header
    if (headerFmt !== 'NONE') {
      if (headerFmt === 'TEXT' && headerText) {
        const comp: any = { type: 'HEADER', format: 'TEXT', text: headerText };
        if (headerTextVars.length > 0 && headerVarExample) {
          comp.example = { header_text: [headerVarExample] };
        }
        comps.push(comp);
      } else if (['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerFmt) && headerMediaUrl) {
        comps.push({
          type:    'HEADER',
          format:  headerFmt,
          example: { header_handle: [headerMediaUrl] },
        });
      }
    }

    // Body (required)
    if (bodyText) {
      const comp: any = { type: 'BODY', text: bodyText };
      if (bodyVars.length > 0) {
        // body_text is array-of-arrays: one inner array per message variant
        const exampleRow = bodyVars.map(v => bodyExamples[v] || `example${v}`);
        comp.example = { body_text: [exampleRow] };
      }
      comps.push(comp);
    }

    // Footer
    if (footerText) {
      comps.push({ type: 'FOOTER', text: footerText });
    }

    // Buttons
    const validButtons = buttons.filter(b => b.text.trim());
    if (validButtons.length > 0) {
      comps.push({
        type: 'BUTTONS',
        buttons: validButtons.map(b => {
          if (b.type === 'QUICK_REPLY')    return { type: 'QUICK_REPLY', text: b.text };
          if (b.type === 'PHONE_NUMBER')   return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone };
          return { type: 'URL', text: b.text, url: b.url };
        }),
      });
    }

    return comps;
  }, [headerFmt, headerText, headerTextVars, headerVarExample, headerMediaUrl,
      bodyText, bodyVars, bodyExamples, footerText, buttons]);

  // ── Preview ───────────────────────────────────────────────────────────────────
  const previewBody = useMemo(() => {
    let text = bodyText;
    bodyVars.forEach(v => {
      text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), bodyExamples[v] || `[example${v}]`);
    });
    return text;
  }, [bodyText, bodyVars, bodyExamples]);

  const previewHeader = useMemo(() => {
    if (headerFmt === 'NONE') return null;
    if (headerFmt === 'TEXT') {
      return headerText.replace(/\{\{1\}\}/g, headerVarExample || '[example]');
    }
    return headerMediaUrl || `[${headerFmt.toLowerCase()} URL required]`;
  }, [headerFmt, headerText, headerVarExample, headerMediaUrl]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const canSubmit = useMemo(() => {
    if (!safeName || !bodyText.trim()) return false;
    if (bodyVars.some(v => !bodyExamples[v]?.trim())) return false;
    if (headerFmt === 'TEXT' && !headerText.trim()) return false;
    if (['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerFmt) && !headerMediaUrl.trim()) return false;
    if (headerFmt === 'TEXT' && headerTextVars.length > 0 && !headerVarExample.trim()) return false;
    return true;
  }, [safeName, bodyText, bodyVars, bodyExamples, headerFmt, headerText, headerTextVars, headerVarExample, headerMediaUrl]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const reset = () => {
    setName(''); setLanguage('en_US'); setCategory('MARKETING');
    setHeaderFmt('NONE'); setHeaderText(''); setHeaderMediaUrl(''); setHeaderVarExample('');
    setBodyText(''); setBodyExamples({}); setFooterText('');
    setButtons([]); setActiveTab('build'); setResult(null);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetchWithTenant(
        '/api/whatsapp-conversations/conversations/templates?channel=waba',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:       safeName,
            language,
            category,
            components: buildComponents(),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: `Template "${safeName}" submitted for Meta review (status: ${data.status ?? 'PENDING'}).` });
        onCreated?.();
      } else {
        setResult({ success: false, message: data.error || 'Meta rejected the template. Check the details and try again.' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err?.message ?? 'Unexpected error submitting template.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Create WhatsApp Template
            <Badge variant="outline" className="text-[10px]">WABA</Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Templates must be approved by Meta before use. Approval usually takes a few minutes.
          </p>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b px-6">
          {(['build', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-2.5 px-4 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'preview' ? <><Eye className="w-3.5 h-3.5 inline mr-1.5" />Preview</> : 'Builder'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Result banner ── */}
          {result && (
            <div className={cn(
              'flex items-start gap-3 p-3 rounded-lg border text-sm',
              result.success ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
            )}>
              {result.success
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
                : <AlertCircle  className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />}
              <p>{result.message}</p>
              {result.success && (
                <button onClick={handleClose} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>
          )}

          {activeTab === 'build' ? (
            <>
              {/* ── Basic info ── */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Info</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Template name <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="my_template_name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    {name && safeName !== name && (
                      <p className="text-[10px] text-amber-600">Will be saved as: <strong>{safeName}</strong></p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Language <span className="text-red-500">*</span></label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full h-8 px-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Category <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={cn(
                          'p-2.5 rounded-lg border text-left transition-colors',
                          category === c.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <p className="text-xs font-semibold">{c.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Header ── */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header <span className="text-muted-foreground font-normal">(optional)</span></h3>

                <div className="flex gap-1.5 flex-wrap">
                  {HEADER_FORMATS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setHeaderFmt(f.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                        headerFmt === f.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {headerFmt === 'TEXT' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Header text (use {{1}} for a variable)"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      className="h-8 text-sm"
                    />
                    {headerTextVars.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Example value for <strong>{'{{1}}'}</strong> (required by Meta)</p>
                        <Input
                          placeholder="e.g. John"
                          value={headerVarExample}
                          onChange={e => setHeaderVarExample(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerFmt) && (
                  <div className="space-y-1">
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg (public URL for Meta review)"
                      value={headerMediaUrl}
                      onChange={e => setHeaderMediaUrl(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Public URL used as the example during Meta's approval. You can change the URL when sending.
                    </p>
                  </div>
                )}
              </section>

              {/* ── Body ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Body <span className="text-red-500">*</span>
                  </h3>
                  <button
                    type="button"
                    onClick={e => insertBodyVar((e.currentTarget.closest('section')?.querySelector('textarea') as HTMLTextAreaElement) ?? null)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add variable
                  </button>
                </div>

                <textarea
                  rows={4}
                  placeholder="Hi {{1}}, your appointment on {{2}} is confirmed."
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />

                {/* Example values for each variable */}
                {bodyVars.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Example values <span className="text-red-500">*</span> — required by Meta for approval
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {bodyVars.map(v => (
                        <div key={v} className="space-y-0.5">
                          <label className="text-[10px] font-mono text-muted-foreground">{`{{${v}}}`}</label>
                          <Input
                            placeholder={`Example for {{${v}}}`}
                            value={bodyExamples[v] || ''}
                            onChange={e => setBodyExamples(prev => ({ ...prev, [v]: e.target.value }))}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Footer ── */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Footer <span className="text-muted-foreground font-normal">(optional)</span></h3>
                <Input
                  placeholder="e.g. Reply STOP to unsubscribe"
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  className="h-8 text-sm"
                />
              </section>

              {/* ── Buttons ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Buttons <span className="text-muted-foreground font-normal">(optional, max 3)</span>
                  </h3>
                  {buttons.length < 3 && (
                    <button
                      type="button"
                      onClick={addButton}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Add button
                    </button>
                  )}
                </div>

                {buttons.map((btn) => (
                  <div key={btn.id} className="p-3 border border-border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={btn.type}
                        onChange={e => updateButton(btn.id, { type: e.target.value as ButtonType })}
                        className="h-7 px-2 border border-input rounded text-xs bg-background focus:outline-none"
                      >
                        <option value="QUICK_REPLY">Quick Reply</option>
                        <option value="URL">URL</option>
                        <option value="PHONE_NUMBER">Phone Number</option>
                      </select>
                      <Input
                        placeholder="Button label"
                        value={btn.text}
                        onChange={e => updateButton(btn.id, { text: e.target.value })}
                        className="flex-1 h-7 text-xs"
                      />
                      <button type="button" onClick={() => removeButton(btn.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {btn.type === 'URL' && (
                      <Input
                        type="url"
                        placeholder="https://example.com/{{1}}"
                        value={btn.url}
                        onChange={e => updateButton(btn.id, { url: e.target.value })}
                        className="h-7 text-xs"
                      />
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                      <Input
                        placeholder="+971501234567"
                        value={btn.phone}
                        onChange={e => updateButton(btn.id, { phone: e.target.value })}
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                ))}
              </section>
            </>
          ) : (
            /* ── Preview tab ── */
            <div className="space-y-4">
              <div className="max-w-xs mx-auto">
                {/* Phone mock */}
                <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[200px]">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-[280px] mx-auto">
                    {/* Header */}
                    {headerFmt !== 'NONE' && (
                      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                        {headerFmt === 'TEXT' ? (
                          <p className="text-sm font-semibold text-slate-800">{previewHeader}</p>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <span className="uppercase font-mono">{headerFmt}</span>
                            {headerMediaUrl
                              ? <span className="text-green-600 truncate max-w-[160px]">{headerMediaUrl}</span>
                              : <span className="text-amber-500">URL required</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <div className="px-3 py-3">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {previewBody || <span className="text-slate-400 italic">Body text appears here...</span>}
                      </p>
                    </div>

                    {/* Footer */}
                    {footerText && (
                      <div className="px-3 pb-2">
                        <p className="text-xs text-slate-400">{footerText}</p>
                      </div>
                    )}

                    {/* Buttons */}
                    {buttons.filter(b => b.text).length > 0 && (
                      <div className="border-t border-slate-100">
                        {buttons.filter(b => b.text).map(b => (
                          <div key={b.id} className="px-3 py-2 text-center text-xs text-blue-600 font-medium border-b border-slate-100 last:border-0">
                            {b.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta submission summary */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <p><span className="text-slate-500">Name:</span> <span className="font-mono font-semibold">{safeName || '—'}</span></p>
                  <p><span className="text-slate-500">Language:</span> {LANGUAGES.find(l => l.code === language)?.label}</p>
                  <p><span className="text-slate-500">Category:</span> {category}</p>
                  <p><span className="text-slate-500">Components:</span> {buildComponents().map((c: any) => c.type).join(', ') || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          {!result?.success && (
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                : <><Send className="w-4 h-4 mr-2" /> Submit to Meta</>}
            </Button>
          )}
          {result?.success && (
            <Button variant="outline" onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
