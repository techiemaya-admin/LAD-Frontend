'use client';

/**
 * ChannelsStep — Step 6: "How your agents talk".
 *
 * The tenant meets their named team (one agent per channel), switches on
 * the channels they will use, and tells each agent how to sound: tone, the
 * first line, the pushback it will hear, when to hand over to a human and
 * what never to say. The fastest path is to share real threads — the style
 * import distils them into "how you sound" and pre-fills the pushback rows.
 *
 * Every edit autosaves (PUT /api/snapshot/studio/channels/:channel) on blur
 * for text and immediately for chips and switches. Readiness is the same
 * rule the backend applies — on + a first line + one hand-over rule — so the
 * tick appears as soon as the tenant types, and the server's verdict
 * replaces it after each save.
 *
 * "Generate my agents" publishes a prompt per ON + ready channel through the
 * existing generate-prompt route, one at a time, and shows who reads it.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, ClipboardPaste, FileUp, Instagram, Linkedin, Loader2,
  Mail, MessageCircle, Phone, Plus, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { isApiError } from '@lad/shared/apiError';
import {
  useChannels,
  useGenerateChannelPrompt,
  useImportStyle,
  useImportStyleFromMailbox,
  useSaveChannel,
  type ChannelMissing,
  type ChannelProfile,
  type ChannelProfileInput,
  type ChannelPromptResult,
  type FieldError,
  type MailboxImportReason,
  type MailboxSource,
  type PushbackRow,
  type StudioChannel,
  type StyleImportResult,
  type StyleProfile,
} from '@lad/frontend-features/tenant-studio';

/* ------------------------------------------------------------------ */
/* Copy                                                                 */
/* ------------------------------------------------------------------ */

/** Where this step sits in the 9-step setup. */
export const CHANNELS_STEP = 6;

export const CHANNEL_ORDER: StudioChannel[] = ['email', 'whatsapp', 'instagram', 'linkedin', 'voice'];

const CHANNEL_META: Record<StudioChannel, { label: string; icon: typeof Mail; openerPlaceholder: string; openerHint: string; neverSay: string[] }> = {
  email: {
    label: 'Email',
    icon: Mail,
    openerPlaceholder: 'Hi {first name}, quick one — saw you are hiring for data roles and wondered whether contract cover would help while you fill them.',
    openerHint: 'A subject line and the first sentence of the email.',
    neverSay: ['Buzzwords like synergy or leverage', 'Guaranteed results', 'Discounts or prices', 'False urgency'],
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    openerPlaceholder: 'Hi {first name}, it’s Rachana from Proximate. You asked about contract Databricks engineers, is now an OK time?',
    openerHint: 'One short message, the way you would actually type it.',
    neverSay: ['Long paragraphs', 'Prices before a call', 'Guaranteed results', 'Formal sign-offs'],
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    openerPlaceholder: 'One warm line — e.g. Loved your post on the new studio, how is the launch going?',
    openerHint: 'One warm line. No pitch yet.',
    neverSay: ['A hard sell in the first message', 'Prices', 'Guaranteed results', 'Corporate jargon'],
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    openerPlaceholder: 'Hi {first name}, thanks for connecting. Saw the roles you posted this week, how’s that search going?',
    openerHint: 'The first message after a connection is accepted.',
    neverSay: ['Guaranteed results', 'Limited-time offers', 'Discounts or prices', 'Competitor names'],
  },
  voice: {
    label: 'Voice',
    icon: Phone,
    openerPlaceholder: 'The opening sentence the caller hears.',
    openerHint: 'The opening sentence the caller hears, before any question.',
    neverSay: ['Prices', 'Guaranteed results', 'Legal or medical claims', 'Competitor names'],
  },
};

const TONE_CHIPS = ['Warm', 'Direct', 'Formal', 'Playful', 'Short', 'Detailed'];
const EMOJI_OPTIONS: { value: string; label: string }[] = [
  { value: 'emoji:none', label: 'none' },
  { value: 'emoji:rarely', label: 'rarely' },
  { value: 'emoji:sometimes', label: 'sometimes' },
];
const EMOJI_CHANNELS: StudioChannel[] = ['whatsapp', 'instagram'];
const PUSHBACK_STARTERS = ['Too expensive', 'We already have a supplier', 'Not now', 'Send me an email'];
const HANDOVER_CHIPS = ['Asks for a price', 'Asks for a meeting', 'Gets angry', 'Mentions a lawyer or complaint', 'Asks something I don’t know'];

/** Chip → the clause the summary card reads out. */
const HANDOVER_PHRASE: Record<string, string> = {
  'Asks for a price': 'asks for a price',
  'Asks for a meeting': 'asks for a meeting',
  'Gets angry': 'gets angry',
  'Mentions a lawyer or complaint': 'mentions a lawyer or complaint',
  [HANDOVER_CHIPS[4]]: 'asks something it cannot answer',
};

const CARD_TITLES = ['Tone', 'First line', 'Pushback you hear most', 'Hand over and never say'];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** The backend's readiness rule, applied locally so the tick is immediate. */
export function computeMissing(row: Pick<ChannelProfile, 'opener' | 'handover'>): ChannelMissing[] {
  const missing: ChannelMissing[] = [];
  if (!row.opener || !row.opener.trim()) missing.push('opener');
  if (!row.handover.length) missing.push('handover');
  return missing;
}

function initials(name: string | null | undefined, fallback: string): string {
  const src = (name && name.trim()) || fallback;
  const parts = src.split(/\s+/).filter(Boolean);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
  return chars.toUpperCase();
}

function filledCount(row: ChannelProfile): number {
  let n = 0;
  if (row.agentName?.trim()) n += 1;
  if (row.tone.some((t) => !t.startsWith('emoji:'))) n += 1;
  if (row.opener?.trim()) n += 1;
  if (row.pushback.some((p) => p.say.trim() && p.answer.trim())) n += 1;
  if (row.handover.length) n += 1;
  if (row.neverSay.length) n += 1;
  return n;
}
const FIELD_TOTAL = 6;

/** Email keeps its subject in the opener as a first "Subject: …" line. */
function splitEmailOpener(opener: string | null): { subject: string; line: string } {
  const text = opener ?? '';
  const m = text.match(/^Subject:\s*(.*)\n?([\s\S]*)$/);
  if (m) return { subject: m[1].trim(), line: m[2].trim() };
  return { subject: '', line: text };
}
function joinEmailOpener(subject: string, line: string): string {
  const s = subject.trim();
  const l = line.trim();
  if (!s && !l) return '';
  return s ? `Subject: ${s}\n${l}` : l;
}

function describeSaveError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { errors?: FieldError[]; error?: string } | undefined;
    const first = body?.errors?.[0];
    if (first) return `${first.path}: ${first.message}`;
    if (err.status === 401) return 'Your session has expired — sign in again.';
    if (body?.error) return body.error;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

function describeMailboxError(err: unknown, source: MailboxSource): string {
  const name = source === 'gmail' ? 'Gmail' : 'Outlook';
  if (isApiError(err)) {
    const body = err.body as { reason?: MailboxImportReason } | undefined;
    if (err.status === 409 || body?.reason === 'not_connected') return `${name} is not connected yet. Connect it in Settings → Email, or paste a conversation instead.`;
    if (err.status === 501 || body?.reason === 'unsupported') return `Pulling from ${name} is not available yet. Paste a conversation instead.`;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

function joinNatural(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
function joinOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

/** Plain-English sentences from the data — the summary card. */
export function describeTeam(rows: ChannelProfile[]): string[] {
  const on = rows.filter((r) => r.isOn);
  const off = rows.filter((r) => !r.isOn);
  const lines: string[] = [];
  for (const r of on) {
    const meta = CHANNEL_META[r.channel];
    const name = r.agentName?.trim() || 'your agent';
    const tones = r.tone.filter((t) => !t.startsWith('emoji:')).map((t) => t.toLowerCase());
    const parts: string[] = [];
    if (tones.length) parts.push(`is ${joinNatural(tones)}`);
    const opener = r.channel === 'email' ? splitEmailOpener(r.opener).line : (r.opener ?? '');
    if (opener.trim()) {
      const short = opener.trim().replace(/\s+/g, ' ');
      parts.push(`opens with “${short.length > 70 ? `${short.slice(0, 67)}…` : short}”`);
    }
    if (r.handover.length) {
      parts.push(`hands over the moment someone ${joinOr(r.handover.map((h) => HANDOVER_PHRASE[h] ?? lowerFirst(h)))}`);
    }
    const emoji = r.tone.find((t) => t.startsWith('emoji:'));
    if (emoji && emoji !== 'emoji:none') parts.push(`uses emoji ${emoji.slice(6)}`);
    if (!parts.length) {
      lines.push(`On ${meta.label} ${name} is switched on but has no instructions yet.`);
    } else {
      lines.push(`On ${meta.label} ${name} ${joinNatural(parts)}.`);
    }
  }
  if (off.length === rows.length) lines.push('Every channel is switched off. Switch one on to give it a voice.');
  else if (off.length) lines.push(`${joinNatural(off.map((r) => CHANNEL_META[r.channel].label))} ${off.length === 1 ? 'is' : 'are'} switched off.`);
  return lines;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                         */
/* ------------------------------------------------------------------ */

function Chip({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
      }`}
    >
      {selected && <Check className="h-3 w-3" />}{children}
    </button>
  );
}

/** Chip rail + a free-text row that adds its own chip. */
function ChipList({ id, options, value, onChange, placeholder, disabled }: {
  id: string; options: string[]; value: string[]; onChange: (next: string[]) => void; placeholder: string; disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const custom = value.filter((v) => !options.includes(v));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const add = () => {
    const t = text.trim();
    if (!t || value.includes(t)) { setText(''); return; }
    onChange([...value, t]);
    setText('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => <Chip key={o} selected={value.includes(o)} onClick={() => toggle(o)} disabled={disabled}>{o}</Chip>)}
        {custom.map((c) => (
          <Chip key={c} selected onClick={() => toggle(c)} disabled={disabled}>{c}<X className="h-3 w-3" /></Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          disabled={disabled}
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={disabled || !text.trim()} aria-label="Add">
          <Plus className="h-4 w-4" />Add
        </Button>
      </div>
    </div>
  );
}

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border bg-card p-4 ${className}`}>
      <h4 className="font-semibold">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status" aria-live="polite">
      {status === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>}
      {status === 'saved' && <><Check className="h-3 w-3 text-emerald-600" />Saved</>}
      {status === 'error' && <><CircleAlert className="h-3 w-3 text-rose-600" />Not saved</>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Fastest path — style import                                          */
/* ------------------------------------------------------------------ */

type ImportMode = null | 'paste' | 'upload';

function StyleImport({ style, onImported }: { style: StyleProfile | null; onImported: (r: StyleImportResult) => void }) {
  const { toast } = useToast();
  const importStyle = useImportStyle();
  const importMailbox = useImportStyleFromMailbox();
  const [mode, setMode] = useState<ImportMode>(null);
  const [pasted, setPasted] = useState('');
  const [fileText, setFileText] = useState<{ name: string; text: string; source: 'whatsapp_export' | 'linkedin_export' } | null>(null);
  const [zipPicked, setZipPicked] = useState<string | null>(null);
  const [mailbox, setMailbox] = useState<MailboxSource | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = importStyle.isPending || importMailbox.isPending;

  const onSuccess = (r: StyleImportResult) => {
    onImported(r);
    setMode(null);
    setPasted('');
    setFileText(null);
    toast({ title: 'Got it', description: `Read ${r.sampleCount} sample${r.sampleCount === 1 ? '' : 's'}.` });
  };

  const submitPaste = () => {
    const text = pasted.trim();
    if (!text) return;
    importStyle.mutate({ samples: [{ source: 'paste', text }] }, {
      onSuccess,
      onError: (err) => toast({ title: 'Could not read that', description: describeSaveError(err), variant: 'destructive' }),
    });
  };

  const submitFile = () => {
    if (!fileText) return;
    importStyle.mutate({ samples: [{ source: fileText.source, text: fileText.text }] }, {
      onSuccess,
      onError: (err) => toast({ title: 'Could not read that file', description: describeSaveError(err), variant: 'destructive' }),
    });
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setZipPicked(null);
    setFileText(null);
    if (/\.zip$/i.test(file.name)) { setZipPicked(file.name); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const source = /linkedin|messages\.csv|inbox/i.test(file.name) ? 'linkedin_export' : 'whatsapp_export';
      setFileText({ name: file.name, text, source });
    };
    reader.onerror = () => toast({ title: 'Could not read that file', description: 'Try a .txt export.', variant: 'destructive' });
    reader.readAsText(file);
  };

  const pull = (source: MailboxSource) => {
    setMailbox(source);
    importMailbox.mutate({ source }, {
      onSuccess,
      onError: (err) => toast({ title: source === 'gmail' ? 'Gmail' : 'Outlook', description: describeMailboxError(err, source), variant: 'destructive' }),
      onSettled: () => setMailbox(null),
    });
  };

  return (
    <section className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold">Fastest path</h3>
        <p className="text-xs text-muted-foreground">Five real threads beat five pages of instructions.</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant={mode === 'paste' ? 'default' : 'outline'} className="justify-start" onClick={() => setMode(mode === 'paste' ? null : 'paste')} disabled={busy}>
          <ClipboardPaste className="h-4 w-4" />Paste a conversation that went well
        </Button>
        <Button type="button" variant={mode === 'upload' ? 'default' : 'outline'} className="justify-start" onClick={() => setMode(mode === 'upload' ? null : 'upload')} disabled={busy}>
          <FileUp className="h-4 w-4" />Upload a chat export
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => pull('gmail')} disabled={busy}>
          {mailbox === 'gmail' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Pull my sent replies from Gmail
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => pull('outlook')} disabled={busy}>
          {mailbox === 'outlook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}…from Outlook
        </Button>
      </div>

      {mode === 'paste' && (
        <div className="mt-3 space-y-2">
          <Label htmlFor="style-paste" className="text-sm">A thread where you sounded like yourself</Label>
          <Textarea
            id="style-paste"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder={'Them: Hi, do you do contract Databricks engineers?\nYou: We do — mostly 3 to 6 month placements. What are you building?'}
            disabled={busy}
            className="min-h-[140px] text-sm"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={submitPaste} disabled={busy || pasted.trim().length < 20}>
              {importStyle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Read it
            </Button>
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div className="mt-3 space-y-2">
          <input ref={fileRef} type="file" accept=".txt,.zip,text/plain,application/zip" className="sr-only" onChange={onFile} aria-label="Chat export file" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="h-4 w-4" />Choose a .txt or .zip export
            </Button>
            {fileText && <span className="text-xs text-muted-foreground">{fileText.name} · {fileText.text.length.toLocaleString()} characters</span>}
            {zipPicked && <span className="text-xs text-muted-foreground">{zipPicked}</span>}
          </div>
          {zipPicked && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Zip exports: coming soon. Unzip it and upload the .txt inside for now.
            </p>
          )}
          <p className="text-xs text-muted-foreground">WhatsApp: Chat → Export chat → Without media. LinkedIn: Settings → Get a copy of your data → Messages.</p>
          <div className="flex justify-end">
            <Button type="button" onClick={submitFile} disabled={busy || !fileText || Boolean(zipPicked)}>
              {importStyle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Read it
            </Button>
          </div>
        </div>
      )}

      {style && (
        <div className="mt-4 rounded-lg border bg-card p-4" data-testid="style-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">Here&rsquo;s how you sound</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                From {style.sampleCount} sample{style.sampleCount === 1 ? '' : 's'}{style.sources.length ? ` · ${style.sources.join(', ')}` : ''}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="style read" />
          </div>
          <p className="mt-2 text-sm leading-relaxed">{style.summary}</p>
          {(style.openers.length > 0 || style.neverWords.length > 0) && (
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {style.openers.length > 0 && (
                <div><dt className="font-medium text-muted-foreground">You usually open with</dt><dd className="mt-0.5">{style.openers.slice(0, 2).join(' · ')}</dd></div>
              )}
              {style.neverWords.length > 0 && (
                <div><dt className="font-medium text-muted-foreground">You never say</dt><dd className="mt-0.5">{style.neverWords.slice(0, 5).join(', ')}</dd></div>
              )}
            </dl>
          )}
          <StyleVerdict />
        </div>
      )}
    </section>
  );
}

/** Looks right / Edit — the summary is read-only for now; Edit just points at the paste box. */
function StyleVerdict() {
  const [verdict, setVerdict] = useState<'ok' | 'edit' | null>(null);
  if (verdict === 'ok') return <p className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" />Great — your agents will borrow this.</p>;
  if (verdict === 'edit') return <p className="mt-3 text-xs text-muted-foreground">Paste another thread above and it will re-read you. Editing the summary by hand is coming soon.</p>;
  return (
    <div className="mt-3 flex gap-2">
      <Button type="button" size="sm" onClick={() => setVerdict('ok')}><Check className="h-4 w-4" />Looks right</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setVerdict('edit')}>Edit</Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent tile + editor                                                  */
/* ------------------------------------------------------------------ */

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function AgentTile({ row, open, status, defaultName, onToggle, onOpen, onPatch, onBlurSave }: {
  row: ChannelProfile;
  open: boolean;
  status: SaveStatus;
  defaultName: string;
  onToggle: (on: boolean) => void;
  onOpen: () => void;
  onPatch: (patch: ChannelProfileInput) => void;
  onBlurSave: (patch: ChannelProfileInput) => void;
}) {
  const meta = CHANNEL_META[row.channel];
  const Icon = meta.icon;
  const missing = computeMissing(row);
  const ready = row.isOn && missing.length === 0;
  const filled = filledCount(row);
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${open ? 'border-primary ring-1 ring-primary/30' : ''} ${row.isOn ? 'bg-card' : 'bg-muted/40'}`}
      data-testid={`agent-tile-${row.channel}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpen}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${row.isOn ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          aria-label={`Open ${meta.label} agent`}
        >
          {initials(row.agentName, defaultName)}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <button type="button" onClick={onOpen} className="truncate text-left text-sm font-semibold underline-offset-2 hover:underline">
              {meta.label}
            </button>
            {ready && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="ready" data-testid={`ready-${row.channel}`} />}
            <span className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{filled}/{FIELD_TOTAL}</span>
              <Switch checked={row.isOn} onCheckedChange={onToggle} aria-label={`${meta.label} on or off`} />
            </span>
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            <Input
              value={row.agentName ?? ''}
              onChange={(e) => onPatch({ agentName: e.target.value })}
              onBlur={(e) => onBlurSave({ agentName: e.target.value.trim() || null })}
              placeholder={defaultName}
              aria-label={`${meta.label} agent name`}
              className="h-8 text-sm"
            />
            <Input
              value={row.agentTitle ?? ''}
              onChange={(e) => onPatch({ agentTitle: e.target.value })}
              onBlur={(e) => onBlurSave({ agentTitle: e.target.value.trim() || null })}
              placeholder="Title, e.g. Client Partner"
              aria-label={`${meta.label} agent title`}
              className="h-8 text-sm"
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {row.isOn && !ready && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-600" data-testid={`hint-${row.channel}`}>
                <CircleAlert className="h-3.5 w-3.5" />Needs a first line and hand-over rules
              </span>
            )}
            {!row.isOn && <span className="text-xs text-muted-foreground">Off</span>}
            <SaveBadge status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentEditor({ row, style, onPatch, onSave }: {
  row: ChannelProfile;
  style: StyleProfile | null;
  onPatch: (patch: ChannelProfileInput) => void;
  onSave: (patch: ChannelProfileInput) => void;
}) {
  const meta = CHANNEL_META[row.channel];
  const [card, setCard] = useState(0);
  const email = row.channel === 'email' ? splitEmailOpener(row.opener) : null;
  const [subject, setSubject] = useState(email?.subject ?? '');
  const [line, setLine] = useState(email?.line ?? '');
  const emoji = row.tone.find((t) => t.startsWith('emoji:')) ?? null;
  const tones = row.tone.filter((t) => !t.startsWith('emoji:'));

  const setTone = (next: string[]) => { onPatch({ tone: next }); onSave({ tone: next }); };
  const toggleTone = (t: string) => setTone(tones.includes(t) ? row.tone.filter((x) => x !== t) : [...row.tone, t]);
  const setEmoji = (v: string) => setTone([...tones, v]);

  const setPushback = (rows: PushbackRow[]) => onPatch({ pushback: rows });
  const savePushback = (rows: PushbackRow[]) => onSave({ pushback: rows.filter((p) => p.say.trim() || p.answer.trim()) });
  const addPushback = (say = '') => {
    if (say && row.pushback.some((p) => p.say === say)) return;
    const suggested = style?.objectionAnswers.find((o) => o.say.toLowerCase() === say.toLowerCase())?.answer ?? '';
    setPushback([...row.pushback, { say, answer: suggested }]);
  };
  const updatePushback = (i: number, patch: Partial<PushbackRow>) => setPushback(row.pushback.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const removePushback = (i: number) => { const next = row.pushback.filter((_, j) => j !== i); setPushback(next); savePushback(next); };

  const saveEmailOpener = (s: string, l: string) => { const v = joinEmailOpener(s, l); onPatch({ opener: v || null }); onSave({ opener: v || null }); };

  const visible = (i: number) => (i === card ? '' : 'hidden md:block');

  return (
    <div className="rounded-lg border bg-muted/20 p-3 sm:p-4" data-testid={`agent-editor-${row.channel}`}>
      <div className="mb-3 flex items-center justify-between md:hidden">
        <Button type="button" size="sm" variant="ghost" onClick={() => setCard((c) => Math.max(0, c - 1))} disabled={card === 0} aria-label="Previous card">
          <ChevronLeft className="h-4 w-4" />Prev
        </Button>
        <span className="text-xs font-medium text-muted-foreground">{CARD_TITLES[card]} · {card + 1} of {CARD_TITLES.length}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => setCard((c) => Math.min(CARD_TITLES.length - 1, c + 1))} disabled={card === CARD_TITLES.length - 1} aria-label="Next card">
          Next<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Tone" hint="Pick what sounds like you." className={visible(0)}>
          <div className="flex flex-wrap gap-1.5">
            {TONE_CHIPS.map((t) => <Chip key={t} selected={tones.includes(t)} onClick={() => toggleTone(t)}>{t}</Chip>)}
          </div>
          {EMOJI_CHANNELS.includes(row.channel) && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Emoji</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((o) => <Chip key={o.value} selected={emoji === o.value} onClick={() => setEmoji(o.value)}>{o.label}</Chip>)}
              </div>
            </div>
          )}
        </Card>

        <Card title="First line" hint={meta.openerHint} className={visible(1)}>
          {row.channel === 'email' ? (
            <div className="space-y-2">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onBlur={() => saveEmailOpener(subject, line)}
                placeholder="Subject line"
                aria-label="Email subject line"
                className="h-9 text-sm"
              />
              <Textarea
                value={line}
                onChange={(e) => setLine(e.target.value)}
                onBlur={() => saveEmailOpener(subject, line)}
                placeholder={meta.openerPlaceholder}
                rows={3}
                aria-label="Email first line"
                className="min-h-[80px] text-sm"
              />
            </div>
          ) : (
            <Textarea
              value={row.opener ?? ''}
              onChange={(e) => onPatch({ opener: e.target.value })}
              onBlur={(e) => onSave({ opener: e.target.value.trim() || null })}
              placeholder={meta.openerPlaceholder}
              rows={3}
              aria-label={`${meta.label} first line`}
              data-testid={`opener-${row.channel}`}
              className="min-h-[88px] text-sm"
            />
          )}
        </Card>

        <Card title="Pushback you hear most" hint="What they say, and what you say back." className={visible(2)}>
          <div className="flex flex-wrap gap-1.5">
            {PUSHBACK_STARTERS.map((s) => (
              <Chip key={s} selected={row.pushback.some((p) => p.say === s)} onClick={() => addPushback(s)}>{s}</Chip>
            ))}
            <Chip selected={false} onClick={() => addPushback('')}><Plus className="h-3 w-3" />Other</Chip>
          </div>
          {row.pushback.length > 0 && (
            <ul className="mt-3 space-y-2">
              {row.pushback.map((p, i) => (
                <li key={i} className="grid gap-1.5 rounded-md border bg-background p-2 sm:grid-cols-[1fr_1.4fr_auto]">
                  <Input
                    value={p.say}
                    onChange={(e) => updatePushback(i, { say: e.target.value })}
                    onBlur={() => savePushback(row.pushback)}
                    placeholder="They say…"
                    aria-label={`Pushback ${i + 1}: they say`}
                    className="h-8 text-sm"
                  />
                  <Input
                    value={p.answer}
                    onChange={(e) => updatePushback(i, { answer: e.target.value })}
                    onBlur={() => savePushback(row.pushback)}
                    placeholder="You answer…"
                    aria-label={`Pushback ${i + 1}: you answer`}
                    className="h-8 text-sm"
                  />
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => removePushback(i)} aria-label={`Remove pushback ${i + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Hand over to a human when…" hint="It stops and tells you the moment any of these happen." className={visible(3)}>
          <ChipList
            id={`handover-${row.channel}`}
            options={HANDOVER_CHIPS}
            value={row.handover}
            onChange={(next) => { onPatch({ handover: next }); onSave({ handover: next }); }}
            placeholder="Something else, e.g. asks about a refund"
          />
          <h4 className="mt-4 font-semibold">Never say</h4>
          <div className="mt-2">
            <ChipList
              id={`neversay-${row.channel}`}
              options={meta.neverSay}
              value={row.neverSay}
              onChange={(next) => { onPatch({ neverSay: next }); onSave({ neverSay: next }); }}
              placeholder="A word or claim it must avoid"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The step                                                             */
/* ------------------------------------------------------------------ */

export interface ChannelsStepProps {
  /** The persona name the agents default to (e.g. the profile's sender name). */
  defaultAgentName?: string | null;
  onContinue: () => void;
  continuing?: boolean;
}

interface GenerateProgress {
  channel: StudioChannel;
  index: number;
  total: number;
}

export default function ChannelsStep({ defaultAgentName, onContinue, continuing }: ChannelsStepProps) {
  const { toast } = useToast();
  const channels = useChannels();
  const save = useSaveChannel();
  const generate = useGenerateChannelPrompt();
  const [rows, setRows] = useState<Record<StudioChannel, ChannelProfile> | null>(null);
  const [style, setStyle] = useState<StyleProfile | null | undefined>(undefined);
  const [open, setOpen] = useState<StudioChannel | null>(null);
  const [status, setStatus] = useState<Partial<Record<StudioChannel, SaveStatus>>>({});
  const [progress, setProgress] = useState<GenerateProgress | null>(null);
  const [generated, setGenerated] = useState<Partial<Record<StudioChannel, ChannelPromptResult['published']>>>({});
  const savedTimers = useRef<Partial<Record<StudioChannel, ReturnType<typeof setTimeout>>>>({});
  const fallbackName = defaultAgentName?.trim() || 'Your agent';

  // Seed local rows once; later refetches must not clobber in-progress edits.
  useEffect(() => {
    if (!channels.data) return;
    if (rows === null) {
      const seeded = {} as Record<StudioChannel, ChannelProfile>;
      for (const ch of CHANNEL_ORDER) {
        const found = channels.data.channels.find((c) => c.channel === ch);
        seeded[ch] = found ?? {
          channel: ch, isOn: false, agentName: null, agentTitle: null, tone: [], opener: null, pushback: [], handover: [], neverSay: [],
          generatedPromptAt: null, ready: false, missing: ['opener', 'handover'],
        };
      }
      setRows(seeded);
    }
    if (style === undefined) setStyle(channels.data.style);
  }, [channels.data, rows, style]);

  useEffect(() => {
    const timers = savedTimers.current;
    return () => { Object.values(timers).forEach((t) => t && clearTimeout(t)); };
  }, []);

  const patch = (ch: StudioChannel, p: ChannelProfileInput) => setRows((r) => (r ? { ...r, [ch]: { ...r[ch], ...p } } : r));

  const persist = (ch: StudioChannel, p: ChannelProfileInput) => {
    setStatus((s) => ({ ...s, [ch]: 'saving' }));
    save.mutate({ channel: ch, patch: p }, {
      onSuccess: (data) => {
        // Trust the server on what it computes; keep the local text the tenant may still be typing.
        setRows((r) => (r ? { ...r, [ch]: { ...r[ch], ready: data.ready, missing: data.missing, generatedPromptAt: data.generatedPromptAt } } : r));
        setStatus((s) => ({ ...s, [ch]: 'saved' }));
        const prev = savedTimers.current[ch];
        if (prev) clearTimeout(prev);
        savedTimers.current[ch] = setTimeout(() => setStatus((s) => ({ ...s, [ch]: 'idle' })), 2000);
      },
      onError: (err) => {
        setStatus((s) => ({ ...s, [ch]: 'error' }));
        toast({ title: `Could not save ${CHANNEL_META[ch].label}`, description: describeSaveError(err), variant: 'destructive' });
      },
    });
  };

  const openTile = (ch: StudioChannel) => {
    setOpen((o) => (o === ch ? null : ch));
    // Prefill pushback from the style profile the first time a channel opens empty.
    const row = rows?.[ch];
    if (row && row.pushback.length === 0 && style?.objectionAnswers.length) {
      const prefill = style.objectionAnswers.map((o) => ({ say: o.say, answer: o.answer }));
      patch(ch, { pushback: prefill });
      persist(ch, { pushback: prefill });
    }
  };

  const onImported = (r: StyleImportResult) => setStyle(r.style);

  const list = useMemo(() => (rows ? CHANNEL_ORDER.map((ch) => rows[ch]) : []), [rows]);
  const readyOn = list.filter((r) => r.isOn && computeMissing(r).length === 0);
  const summary = useMemo(() => describeTeam(list), [list]);

  const generateAll = async () => {
    if (!readyOn.length) return;
    setGenerated({});
    for (let i = 0; i < readyOn.length; i += 1) {
      const ch = readyOn[i].channel;
      setProgress({ channel: ch, index: i + 1, total: readyOn.length });
      try {
        const res = await generate.mutateAsync({ channel: ch, publish: true });
        setGenerated((g) => ({ ...g, [ch]: res.published }));
        if (res.missing_fields?.length) {
          toast({ title: `${CHANNEL_META[ch].label}: a few gaps`, description: `${res.missing_fields.length} profile answer${res.missing_fields.length === 1 ? '' : 's'} would make it sharper.` });
        }
      } catch (err) {
        toast({ title: `Could not generate ${CHANNEL_META[ch].label}`, description: describeSaveError(err), variant: 'destructive' });
      }
    }
    setProgress(null);
  };

  if (channels.isLoading || (channels.data && rows === null)) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Meeting your team…</div>;
  }
  if (channels.data === undefined) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Your channels could not load right now. Refresh, or try again in a moment.</p>
        <Button type="button" variant="outline" onClick={() => channels.refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold leading-snug sm:text-2xl">Meet your team, and tell them how to talk.</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Only switch on what you&rsquo;ll use. You can add channels later.</p>
      </div>

      <StyleImport style={style ?? null} onImported={onImported} />

      <div className="space-y-3">
        <h3 className="font-semibold">Your team</h3>
        <div className="space-y-2">
          {list.map((row) => (
            <div key={row.channel} className="space-y-2">
              <AgentTile
                row={row}
                open={open === row.channel}
                status={status[row.channel] ?? 'idle'}
                defaultName={fallbackName}
                onToggle={(on) => { patch(row.channel, { isOn: on }); persist(row.channel, { isOn: on }); if (on && open === null) openTile(row.channel); }}
                onOpen={() => openTile(row.channel)}
                onPatch={(p) => patch(row.channel, p)}
                onBlurSave={(p) => persist(row.channel, p)}
              />
              {open === row.channel && (
                <AgentEditor
                  key={row.channel}
                  row={row}
                  style={style ?? null}
                  onPatch={(p) => patch(row.channel, p)}
                  onSave={(p) => persist(row.channel, p)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-4" data-testid="team-summary">
        <h3 className="font-semibold">Here&rsquo;s how your agents will sound.</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Edit anything that looks wrong.</p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
          {summary.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
        <ul className="mt-3 space-y-1 border-t pt-3 text-xs">
          {list.map((r) => {
            const missing = computeMissing(r);
            const pub = generated[r.channel];
            return (
              <li key={r.channel} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {r.isOn && missing.length === 0
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-label="ready" />
                  : r.isOn
                    ? <CircleAlert className="h-3.5 w-3.5 text-rose-600" aria-label="not ready" />
                    : <span className="inline-block h-3.5 w-3.5 rounded-full border" aria-label="off" />}
                <span className="font-medium">{CHANNEL_META[r.channel].label}</span>
                <span className="text-muted-foreground">
                  {!r.isOn ? 'off' : missing.length === 0 ? (r.agentName?.trim() ? `${r.agentName.trim()} is ready` : 'ready') : `needs ${joinNatural(missing.map((m) => (m === 'opener' ? 'a first line' : 'hand-over rules')))}`}
                </span>
                {pub && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${pub.saved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`} title={pub.note}>
                    {pub.saved ? `read by ${pub.readBy}` : 'not saved'}{pub.note ? ` · ${pub.note}` : ''}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {progress && (
          <p className="text-sm text-muted-foreground sm:mr-auto" role="status" aria-live="polite">
            Generating {CHANNEL_META[progress.channel].label}… {progress.index} of {progress.total}
          </p>
        )}
        <Button type="button" variant="outline" size="lg" onClick={generateAll} disabled={!readyOn.length || Boolean(progress) || continuing} className="w-full sm:w-auto">
          {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate my agents
        </Button>
        <Button type="button" size="lg" onClick={onContinue} disabled={Boolean(progress) || continuing} className="w-full sm:w-auto">
          {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {!readyOn.length && (
        <p className="-mt-3 text-xs text-muted-foreground sm:text-right">Switch a channel on and give it a first line and a hand-over rule to generate its agent.</p>
      )}
    </div>
  );
}
