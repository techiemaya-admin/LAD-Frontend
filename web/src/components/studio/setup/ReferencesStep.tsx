'use client';

/**
 * ReferencesStep — Step 8: "Brand and references".
 *
 * Everything real the tenant can hand over so the agents sound like them
 * and quote their own material: conversations (Step 6's style import,
 * reused), links and posts that worked, their story and values, colours,
 * logo and fonts, and documents (decks, price lists, case studies).
 *
 * One drop zone at the top sorts whatever lands in it: images become logos
 * (and a palette), a PDF or deck named like a brand/tone guide becomes the
 * brand guide, everything else is a document. Five tiles below show what
 * has been shared, one open at a time. Nothing here is required.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Keyboard, Link2, Loader2, Mic, MicOff,
  MessagesSquare, Palette, Plus, Sparkles, Trash2, Trophy, Type, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { isApiError } from '@lad/shared/apiError';
import {
  useAddReferenceLinks,
  useDeleteReference,
  usePullReferencePosts,
  useReferences,
  useSaveBrand,
  useSaveBrandStory,
  useStyle,
  useUpdateReference,
  useUploadBrandGuide,
  useUploadBrandLogos,
  useUploadReferences,
  emptyBrand,
  type BrandFont,
  type BrandProfile,
  type BrandStoryAnswers,
  type FontRole,
  type PaletteRole,
  type PaletteSwatch,
  type PostsPullSourceResult,
  type ReferenceItem,
  type ReferencePurpose,
  type ReferencesSummary,
  type StyleProfile,
} from '@lad/frontend-features/tenant-studio';
import { StyleImport } from './ChannelsStep';
import { useDictation } from './speech';
import { BORDER, CARD, CARD_ACTIVE, CARD_HOVER, CTA_PRIMARY, DIVIDE, H_STEP, INPUT_FOCUS, PANEL, READY_PULSE, SKELETON, STATUS, TINT } from '../studio-theme';

/** Where this step sits in the 9-step setup. */
export const REFERENCES_STEP = 8;

const MAX_DROP_FILES = 25;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LINKS = 20;
const MAX_PALETTE = 8;
const MAX_FONTS = 4;
const STORY_SECONDS = 60;
const UPLOAD_BATCH = 10;

const ACCEPT = '.pdf,.docx,.pptx,.png,.jpg,.jpeg,.svg,.csv,.txt,.md,.json';
const IMAGE_EXT = /\.(png|jpe?g|svg)$/i;
const GUIDE_EXT = /\.(pdf|pptx)$/i;
const GUIDE_NAME = /brand|tone|style|guide|identity/i;
const FONT_EXT = /\.(ttf|otf|woff2?)$/i;

const PURPOSES: { value: ReferencePurpose; label: string }[] = [
  { value: 'pitch_deck', label: 'Pitch deck' },
  { value: 'price_list', label: 'Price list' },
  { value: 'case_study', label: 'Case study' },
  { value: 'proposal_template', label: 'Proposal template' },
  { value: 'tone_guide', label: 'Tone guide' },
  { value: 'other', label: 'Other' },
];

const ROLES: { value: PaletteRole | ''; label: string }[] = [
  { value: '', label: 'No role' },
  { value: 'primary', label: 'Main colour' },
  { value: 'secondary', label: 'Second colour' },
  { value: 'accent', label: 'Highlight' },
  { value: 'background', label: 'Background' },
  { value: 'text', label: 'Text' },
];

const FONT_ROLES: { value: FontRole | ''; label: string }[] = [
  { value: '', label: 'Either' },
  { value: 'headline', label: 'Headlines' },
  { value: 'body', label: 'Body text' },
];

/** Popular Google Fonts families — a static list; the file bytes are never fetched here. */
export const GOOGLE_FONTS = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter', 'Oswald', 'Raleway', 'Nunito', 'Nunito Sans',
  'Playfair Display', 'Merriweather', 'PT Sans', 'PT Serif', 'Source Sans 3', 'Source Serif 4', 'Ubuntu', 'Rubik', 'Work Sans', 'Manrope',
  'DM Sans', 'DM Serif Display', 'Karla', 'Mulish', 'Quicksand', 'Josefin Sans', 'Fira Sans', 'Fira Code', 'Noto Sans', 'Noto Serif',
  'Libre Franklin', 'Libre Baskerville', 'Lora', 'Cormorant Garamond', 'EB Garamond', 'Crimson Text', 'Bitter', 'Arimo', 'Cabin', 'Barlow',
  'Titillium Web', 'Hind', 'Heebo', 'Archivo', 'Space Grotesk', 'Space Mono', 'IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono', 'JetBrains Mono',
  'Bebas Neue', 'Anton', 'Abril Fatface', 'Lobster', 'Pacifico', 'Dancing Script', 'Caveat', 'Comfortaa', 'Exo 2', 'Kanit',
];

const STORY_PROMPTS: { key: keyof BrandStoryAnswers; question: string; hint: string }[] = [
  { key: 'why', question: 'Why did you start this business?', hint: 'The real reason, not the website version.' },
  { key: 'promise', question: 'What do you promise every customer?', hint: 'The thing they can count on.' },
  { key: 'refuse', question: 'What do you refuse to do, even if it costs you a sale?', hint: 'Lines you will not cross.' },
  { key: 'knownFor', question: 'What do you want to be known for?', hint: 'One sentence someone would repeat.' },
];

const STATUS_COPY: Record<ReferenceItem['extraction_status'], { label: string; className: string }> = {
  pending: { label: 'Reading…', className: STATUS.optional },
  done: { label: 'Read', className: STATUS.ready },
  failed: { label: 'Could not read', className: STATUS.needed },
  skipped: { label: 'Stored', className: STATUS.optional },
};

type TileKey = 'talk' | 'worked' | 'story' | 'brand' | 'documents';

function describeError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { error?: string; details?: unknown } | undefined;
    if (err.status === 413) return 'That file is too big — 20 MB is the limit.';
    if (err.status === 415) return 'That file type is not supported yet.';
    if (err.status === 401) return 'Your session has expired — sign in again.';
    if (body?.error) return body.error;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

function describePull(r: PostsPullSourceResult): string {
  const name = r.source === 'linkedin' ? 'LinkedIn' : 'Instagram';
  if (r.ok) return r.count ? `${name}: pulled ${r.count} post${r.count === 1 ? '' : 's'}.` : `${name}: no recent posts found.`;
  if (r.reason === 'not_connected') return `${name} is not connected yet. Connect it in Settings → Channels, then try again.`;
  if (r.reason === 'unsupported') return `Pulling from ${name} is not available yet. Paste a link to a post instead.`;
  return `${name}: could not pull posts right now.`;
}

function isHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

function fontFamilyFromFile(name: string): string {
  return name.replace(FONT_EXT, '').replace(/[-_]+/g, ' ').replace(/\b(regular|bold|italic|light|medium|black|thin)\b/gi, '').trim() || name;
}

function fmtBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Splits a drop by type: images → logos, a guide-looking PDF/deck → brand guide, the rest → documents. */
export function sortDrop(files: File[]): { logos: File[]; guides: File[]; documents: File[]; rejected: { file: File; why: string }[] } {
  const out = { logos: [] as File[], guides: [] as File[], documents: [] as File[], rejected: [] as { file: File; why: string }[] };
  for (const f of files.slice(0, MAX_DROP_FILES)) {
    if (f.size > MAX_FILE_BYTES) { out.rejected.push({ file: f, why: 'over 20 MB' }); continue; }
    if (IMAGE_EXT.test(f.name)) {
      if (f.size > MAX_LOGO_BYTES) out.rejected.push({ file: f, why: 'logos must be under 5 MB' });
      else out.logos.push(f);
    } else if (GUIDE_EXT.test(f.name) && GUIDE_NAME.test(f.name)) {
      out.guides.push(f);
    } else {
      out.documents.push(f);
    }
  }
  for (const f of files.slice(MAX_DROP_FILES)) out.rejected.push({ file: f, why: `only ${MAX_DROP_FILES} at a time` });
  return out;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                         */
/* ------------------------------------------------------------------ */

function NativeSelect({ id, value, onChange, options, disabled, ariaLabel, className = '' }: {
  id?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean; ariaLabel?: string; className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/60 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Tile({ icon: Icon, title, hint, count, open, onOpen }: {
  icon: typeof FileText; title: string; hint: string; count: number; open: boolean; onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      className={`flex w-full items-center gap-3 p-3 text-left ${open ? CARD_ACTIVE : `${CARD} ${CARD_HOVER}`}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${count > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_2px_8px_-2px_rgba(16,185,129,.5)]' : 'bg-gradient-to-br from-[#2B7CFF]/15 to-[#C049FF]/15 text-[#7C5CFF] dark:from-[#2B7CFF]/25 dark:to-[#C049FF]/25 dark:text-[#B69CFF]'}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{title}</span>
          {count > 0 && <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${TINT.ready}`} aria-label="has content" />}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${count > 0 ? STATUS.ready : STATUS.optional}`} data-testid={`tile-count-${title}`}>
        {count}
      </span>
      <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
    </button>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className={`${CARD} p-4`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Tile 2 — what worked before                                          */
/* ------------------------------------------------------------------ */

interface LinkRow { id: number; url: string; note: string }

function WorkedPanel({ items, onItems, onRemoved }: { items: ReferenceItem[]; onItems: (add: ReferenceItem[]) => void; onRemoved: (id: string) => void }) {
  const { toast } = useToast();
  const addLinks = useAddReferenceLinks();
  const pull = usePullReferencePosts();
  const remove = useDeleteReference();
  const [rows, setRows] = useState<LinkRow[]>([{ id: 1, url: '', note: '' }]);
  const nextId = useRef(2);
  const existing = items.filter((i) => i.kind === 'link' || i.kind === 'post');
  const clean = rows.map((r) => ({ url: r.url.trim(), note: r.note.trim() || undefined })).filter((r) => /^https?:\/\//i.test(r.url));

  const save = () => {
    if (!clean.length) return;
    addLinks.mutate({ links: clean }, {
      onSuccess: (added) => {
        onItems(added);
        setRows([{ id: nextId.current++, url: '', note: '' }]);
        toast({ title: 'Got it', description: `Read ${added.length} link${added.length === 1 ? '' : 's'}.` });
      },
      onError: (err) => toast({ title: 'Could not read those links', description: describeError(err), variant: 'destructive' }),
    });
  };
  const pullPosts = () => {
    pull.mutate({ sources: ['linkedin', 'instagram'] }, {
      onSuccess: (r) => {
        onItems(r.items);
        r.results.forEach((res) => toast({ title: res.source === 'linkedin' ? 'LinkedIn' : 'Instagram', description: describePull(res), variant: res.ok ? 'default' : 'destructive' }));
      },
      onError: (err) => toast({ title: 'Could not pull your posts', description: describeError(err), variant: 'destructive' }),
    });
  };
  const busy = addLinks.isPending || pull.isPending;
  return (
    <Panel>
      <p className="text-sm text-muted-foreground">A post that got replies, a page that converts, a message that landed. It learns what worked, not just what you say.</p>
      <Button type="button" variant="outline" className="mt-3 w-full justify-start hover:border-[#7C5CFF]/50 sm:w-auto" onClick={pullPosts} disabled={busy}>
        {pull.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}Pull my recent LinkedIn and Instagram posts
      </Button>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium">Links</p>
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input type="url" inputMode="url" value={row.url} onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, url: e.target.value } : r)))} placeholder="https://…" aria-label="Link" disabled={busy} className={`h-9 text-sm ${INPUT_FOCUS}`} />
            <Input value={row.note} onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, note: e.target.value } : r)))} placeholder="What made this one work?" aria-label="What made this one work?" disabled={busy} className={`h-9 text-sm ${INPUT_FOCUS}`} />
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== row.id) : rs))} aria-label="Remove link" disabled={busy || rows.length === 1} className="justify-self-end">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { id: nextId.current++, url: '', note: '' }])} disabled={busy || rows.length + existing.length >= MAX_LINKS}>
            <Plus className="h-4 w-4" />Another link
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={busy || !clean.length} className={CTA_PRIMARY}>
            {addLinks.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Read {clean.length || ''} link{clean.length === 1 ? '' : 's'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Up to {MAX_LINKS} links.</p>
      </div>
      {existing.length > 0 && (
        <ul className={`mt-4 divide-y border-t ${DIVIDE} ${BORDER} text-sm`}>
          {existing.map((it) => (
            <li key={it.id} className="flex items-start gap-2 py-2">
              {it.kind === 'post' ? <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{it.title || it.source_url || (it.kind === 'post' ? 'Post' : 'Link')}</span>
                {(it.extracted.hook || it.extracted.summary || it.note) && (
                  <span className="block truncate text-xs text-muted-foreground">{String(it.extracted.hook || it.extracted.summary || it.note)}</span>
                )}
              </span>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => remove.mutate(it.id, { onSuccess: () => onRemoved(it.id), onError: (err) => toast({ title: 'Could not remove it', description: describeError(err), variant: 'destructive' }) })} aria-label={`Remove ${it.title || 'item'}`} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Tile 3 — your story and values                                       */
/* ------------------------------------------------------------------ */

function StoryPanel({ brand, onBrand, onItem }: { brand: BrandProfile | null; onBrand: (b: BrandProfile) => void; onItem: (it: ReferenceItem) => void }) {
  const { toast } = useToast();
  const saveStory = useSaveBrandStory();
  const [mode, setMode] = useState<'type' | 'record' | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<BrandStoryAnswers>({ why: '', promise: '', refuse: '', knownFor: '' });
  const prompt = STORY_PROMPTS[step];
  const mic = useDictation((text) => setAnswers((a) => ({ ...a, [prompt.key]: text })), STORY_SECONDS);
  const filled = STORY_PROMPTS.filter((p) => answers[p.key].trim()).length;
  const hasStory = Boolean(brand?.story);

  const submit = () => {
    if (mic.listening) mic.stop();
    saveStory.mutate({ answers }, {
      onSuccess: (r) => { onBrand(r.brand); if (r.item) onItem(r.item); setMode(null); setStep(0); toast({ title: 'Written up', description: 'Your story is below. Edit anything that reads wrong.' }); },
      onError: (err) => toast({ title: 'Could not write it up', description: describeError(err), variant: 'destructive' }),
    });
  };
  const go = (next: number) => { if (mic.listening) mic.stop(); setStep(Math.max(0, Math.min(STORY_PROMPTS.length - 1, next))); };

  return (
    <Panel>
      <p className="text-sm text-muted-foreground">Four short questions. Your answers become the story your agents tell, the promises they make and the lines they never cross.</p>
      {mode === null ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="justify-start hover:border-[#7C5CFF]/50" onClick={() => setMode('type')}><Keyboard className="h-4 w-4" />{hasStory ? 'Answer again' : 'Type it'}</Button>
          <Button type="button" variant="outline" className="justify-start hover:border-[#7C5CFF]/50" onClick={() => setMode('record')} disabled={!mic.supported} title={mic.supported ? undefined : 'Your browser has no microphone dictation'}>
            <Mic className="h-4 w-4" />Record 60 seconds
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3" data-testid="story-prompt">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {step + 1} of {STORY_PROMPTS.length}</span>
            <span>{filled} answered</span>
          </div>
          <div>
            <Label htmlFor={`story-${prompt.key}`} className="text-base font-semibold">{prompt.question}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">{prompt.hint}</p>
          </div>
          <div className="relative">
            <Textarea
              id={`story-${prompt.key}`}
              value={answers[prompt.key]}
              onChange={(e) => setAnswers((a) => ({ ...a, [prompt.key]: e.target.value }))}
              rows={4}
              maxLength={2000}
              placeholder={mode === 'record' ? 'Tap the mic and talk — you have a minute.' : 'A sentence or two is plenty.'}
              disabled={saveStory.isPending}
              className={`min-h-[110px] text-sm ${INPUT_FOCUS} ${mode === 'record' ? 'pr-14' : ''}`}
            />
            {mode === 'record' && mic.supported && (
              <Button
                type="button"
                size="icon"
                variant={mic.listening ? 'destructive' : 'outline'}
                className={`absolute right-2 top-2 rounded-full ${mic.listening ? 'animate-pulse motion-reduce:animate-none' : 'hover:border-[#7C5CFF]/50'}`}
                onClick={() => (mic.listening ? mic.stop() : mic.start(answers[prompt.key]))}
                aria-pressed={mic.listening}
                aria-label={mic.listening ? 'Stop recording' : 'Record your answer'}
                disabled={saveStory.isPending}
              >
                {mic.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {mode === 'record' && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {mic.listening ? `Listening… ${mic.secondsLeft ?? STORY_SECONDS}s left.` : 'Up to 60 seconds per answer. You can fix the words after.'}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || saveStory.isPending}><ChevronLeft className="h-4 w-4" />Back</Button>
              {step < STORY_PROMPTS.length - 1 && (
                <Button type="button" size="sm" variant="outline" onClick={() => go(step + 1)} disabled={saveStory.isPending}>Next<ChevronRight className="h-4 w-4" /></Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => { if (mic.listening) mic.stop(); setMode(null); }} disabled={saveStory.isPending}>Cancel</Button>
              <Button type="button" size="sm" onClick={submit} disabled={saveStory.isPending || filled === 0} className={CTA_PRIMARY}>
                {saveStory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Write it up
              </Button>
            </div>
          </div>
        </div>
      )}
      {hasStory && brand && (
        <div className={`${PANEL} mt-4 p-4`} data-testid="story-card">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-semibold tracking-tight">Your story</h4>
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${TINT.ready} ${READY_PULSE}`} aria-label="story written" />
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{brand.story}</p>
          {(brand.promises.length > 0 || brand.never_do.length > 0 || brand.known_for) && (
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {brand.promises.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">We promise</dt>
                  <dd><ul className="mt-1 list-disc space-y-0.5 pl-4">{brand.promises.map((p, i) => <li key={i}>{p}</li>)}</ul></dd>
                </div>
              )}
              {brand.never_do.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">We never</dt>
                  <dd><ul className="mt-1 list-disc space-y-0.5 pl-4">{brand.never_do.map((p, i) => <li key={i}>{p}</li>)}</ul></dd>
                </div>
              )}
              {brand.known_for && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Known for</dt>
                  <dd className="mt-0.5">{brand.known_for}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Tile 4 — colours, logo and fonts                                     */
/* ------------------------------------------------------------------ */

function BrandPanel({ brand, onBrand, onItem }: { brand: BrandProfile | null; onBrand: (b: BrandProfile) => void; onItem: (it: ReferenceItem) => void }) {
  const { toast } = useToast();
  const uploadLogos = useUploadBrandLogos();
  const uploadGuide = useUploadBrandGuide();
  const save = useSaveBrand();
  const logoRef = useRef<HTMLInputElement>(null);
  const guideRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLInputElement>(null);
  const b = brand ?? emptyBrand();
  const [palette, setPalette] = useState<PaletteSwatch[]>(b.palette);
  const [fonts, setFonts] = useState<BrandFont[]>(b.fonts);
  const [fontQuery, setFontQuery] = useState('');
  const [showFontSearch, setShowFontSearch] = useState(false);
  const paletteKey = JSON.stringify(b.palette);
  const fontsKey = JSON.stringify(b.fonts);

  // The server wins after every upload/save; local edits live until then.
  useEffect(() => { setPalette(JSON.parse(paletteKey)); }, [paletteKey]);
  useEffect(() => { setFonts(JSON.parse(fontsKey)); }, [fontsKey]);

  const paletteDirty = JSON.stringify(palette) !== paletteKey;
  const fontsDirty = JSON.stringify(fonts) !== fontsKey;
  const paletteValid = palette.every((s) => isHex(s.hex));
  const busy = uploadLogos.isPending || uploadGuide.isPending || save.isPending;

  const onLogoFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    e.target.value = '';
    if (!files.length) return;
    uploadLogos.mutate({ files }, {
      onSuccess: (nb) => { onBrand(nb); toast({ title: 'Logo saved', description: nb.palette.length ? `Pulled ${nb.palette.length} colours from it.` : 'Stored.' }); },
      onError: (err) => toast({ title: 'Could not upload the logo', description: describeError(err), variant: 'destructive' }),
    });
  };
  const onGuideFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    uploadGuide.mutate({ file }, {
      onSuccess: (r) => { onBrand(r.brand); onItem(r.item); toast({ title: 'Brand guide read', description: 'Colours, fonts and tone rules are in.' }); },
      onError: (err) => toast({ title: 'Could not read the brand guide', description: describeError(err), variant: 'destructive' }),
    });
  };
  const onFontFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setFonts((fs) => {
      const next = [...fs];
      for (const f of files) {
        if (next.length >= MAX_FONTS) break;
        const family = fontFamilyFromFile(f.name);
        if (!next.some((x) => x.family.toLowerCase() === family.toLowerCase())) next.push({ family, role: null, source: 'upload' });
      }
      return next;
    });
  };
  const addGoogleFont = (family: string) => {
    setFonts((fs) => (fs.length >= MAX_FONTS || fs.some((x) => x.family.toLowerCase() === family.toLowerCase()) ? fs : [...fs, { family, role: null, source: 'google', url: `https://fonts.google.com/specimen/${encodeURIComponent(family.replace(/ /g, '+'))}` }]));
    setFontQuery('');
    setShowFontSearch(false);
  };
  const persist = (patch: { palette?: PaletteSwatch[]; fonts?: BrandFont[] }) => {
    save.mutate(patch, {
      onSuccess: (nb) => { onBrand(nb); toast({ title: 'Saved' }); },
      onError: (err) => toast({ title: 'Could not save', description: describeError(err), variant: 'destructive' }),
    });
  };
  const fontMatches = useMemo(() => {
    const q = fontQuery.trim().toLowerCase();
    return (q ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q)) : GOOGLE_FONTS).slice(0, 12);
  }, [fontQuery]);

  return (
    <Panel>
      <input ref={logoRef} type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" multiple className="sr-only" onChange={onLogoFiles} aria-label="Logo files" />
      <input ref={guideRef} type="file" accept=".pdf,.pptx,application/pdf" className="sr-only" onChange={onGuideFile} aria-label="Brand guide file" />
      <input ref={fontRef} type="file" accept=".ttf,.otf,.woff,.woff2" multiple className="sr-only" onChange={onFontFiles} aria-label="Font files" />

      {/* Logo */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Logo</p>
          <Button type="button" size="sm" variant="outline" onClick={() => logoRef.current?.click()} disabled={busy || b.logos.length >= 3} className="hover:border-[#7C5CFF]/50">
            {uploadLogos.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload logo
          </Button>
        </div>
        {b.logos.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {b.logos.map((l, i) => (
              <li key={`${l.url}-${i}`} className={`flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl border ${BORDER} p-1 ${l.variant === 'dark' ? 'bg-zinc-900 dark:bg-zinc-900' : 'bg-white dark:bg-white'}`} title={l.fileName ?? undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.url} alt={l.fileName ?? 'Logo'} className="max-h-full max-w-full object-contain" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or SVG, up to three (a dark and a light version helps). It reads your colours from it.</p>
        )}
      </div>

      {/* Colours */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Colours</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => guideRef.current?.click()} disabled={busy} className="hover:border-[#7C5CFF]/50">
              {uploadGuide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Upload brand guide
            </Button>
            {palette.length === 0 && (
              <Button type="button" size="sm" variant="outline" onClick={() => setPalette([{ hex: '#0B3C5D', role: 'primary' }])} disabled={busy} className="hover:border-[#7C5CFF]/50">
                <Palette className="h-4 w-4" />Enter colours myself
              </Button>
            )}
          </div>
        </div>
        {palette.length ? (
          <ul className="mt-2 space-y-2" data-testid="palette">
            {palette.map((sw, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={isHex(sw.hex) ? sw.hex : '#000000'}
                  onChange={(e) => setPalette((p) => p.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))}
                  aria-label={`Colour ${i + 1}`}
                  className={`h-9 w-10 shrink-0 cursor-pointer rounded-md border ${BORDER} bg-background p-0.5`}
                  disabled={busy}
                />
                <Input
                  value={sw.hex}
                  onChange={(e) => setPalette((p) => p.map((x, j) => (j === i ? { ...x, hex: e.target.value.trim() } : x)))}
                  aria-label={`Colour ${i + 1} hex`}
                  aria-invalid={!isHex(sw.hex)}
                  className={`h-9 w-28 font-mono text-sm ${INPUT_FOCUS} ${isHex(sw.hex) ? '' : 'border-rose-400 dark:border-rose-500'}`}
                  disabled={busy}
                />
                <NativeSelect value={sw.role ?? ''} onChange={(v) => setPalette((p) => p.map((x, j) => (j === i ? { ...x, role: (v || null) as PaletteRole | null } : x)))} options={ROLES} ariaLabel={`Colour ${i + 1} role`} disabled={busy} className="min-w-0 flex-1" />
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => setPalette((p) => p.filter((_, j) => j !== i))} aria-label={`Remove colour ${i + 1}`} disabled={busy}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Upload a logo or a brand guide and the colours fill in, or enter them yourself.</p>
        )}
        {palette.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="sm" variant="outline" onClick={() => setPalette((p) => [...p, { hex: '#FFFFFF', role: null }])} disabled={busy || palette.length >= MAX_PALETTE} className="hover:border-[#7C5CFF]/50">
              <Plus className="h-4 w-4" />Add a colour
            </Button>
            <Button type="button" size="sm" onClick={() => persist({ palette })} disabled={busy || !paletteDirty || !paletteValid} className={CTA_PRIMARY}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save colours
            </Button>
            {!paletteValid && <span className={`self-center text-xs ${TINT.neededText}`}>Use the form #RRGGBB.</span>}
          </div>
        )}
      </div>

      {/* Fonts */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Fonts</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fontRef.current?.click()} disabled={busy || fonts.length >= MAX_FONTS} className="hover:border-[#7C5CFF]/50">
              <Upload className="h-4 w-4" />Upload a font file
            </Button>
            <Button type="button" size="sm" variant={showFontSearch ? 'default' : 'outline'} onClick={() => setShowFontSearch((v) => !v)} disabled={busy || fonts.length >= MAX_FONTS} className={showFontSearch ? CTA_PRIMARY : 'hover:border-[#7C5CFF]/50'}>
              <Type className="h-4 w-4" />Pick a Google Font
            </Button>
          </div>
        </div>
        {showFontSearch && (
          <div className={`${PANEL} mt-2 p-2`}>
            <Input value={fontQuery} onChange={(e) => setFontQuery(e.target.value)} placeholder="Search fonts…" aria-label="Search Google Fonts" className={`h-9 text-sm ${INPUT_FOCUS}`} autoFocus />
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Font matches">
              {fontMatches.map((f) => (
                <li key={f}>
                  <button type="button" onClick={() => addGoogleFont(f)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition-colors duration-150 hover:border-[#7C5CFF]/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{f}</button>
                </li>
              ))}
              {fontMatches.length === 0 && <li className="text-xs text-muted-foreground">No match — upload the file instead.</li>}
            </ul>
          </div>
        )}
        {fonts.length ? (
          <ul className="mt-2 space-y-2" data-testid="fonts">
            {fonts.map((f, i) => (
              <li key={`${f.family}-${i}`} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {f.family} <span className="text-xs text-muted-foreground">· {f.source === 'google' ? 'Google Fonts' : 'your file'}</span>
                </span>
                <NativeSelect value={f.role ?? ''} onChange={(v) => setFonts((fs) => fs.map((x, j) => (j === i ? { ...x, role: (v || null) as FontRole | null } : x)))} options={FONT_ROLES} ariaLabel={`${f.family} role`} disabled={busy} />
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => setFonts((fs) => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.family}`} disabled={busy}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Up to four. Only the name is kept for now; the file itself is not uploaded yet.</p>
        )}
        {fontsDirty && (
          <div className="mt-2">
            <Button type="button" size="sm" onClick={() => persist({ fonts })} disabled={busy} className={CTA_PRIMARY}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save fonts
            </Button>
          </div>
        )}
      </div>

      {b.tone_rules.length > 0 && (
        <div className={`mt-5 border-t ${BORDER} pt-3`}>
          <p className="text-sm font-medium">From your brand guide</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {b.tone_rules.slice(0, 6).map((r, i) => <li key={i}>{r.do ? `Do: ${r.do}` : r.dont ? `Don't: ${r.dont}` : null}</li>)}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Tile 5 — documents                                                   */
/* ------------------------------------------------------------------ */

function DocumentsPanel({ items, onItem, onRemoved, onAdd }: { items: ReferenceItem[]; onItem: (it: ReferenceItem) => void; onRemoved: (id: string) => void; onAdd: () => void }) {
  const { toast } = useToast();
  const update = useUpdateReference();
  const remove = useDeleteReference();
  const [busyId, setBusyId] = useState<string | null>(null);
  const docs = items.filter((i) => i.kind === 'document' || i.kind === 'brand_guide');
  const setPurpose = (it: ReferenceItem, purpose: string) => {
    setBusyId(it.id);
    update.mutate({ id: it.id, patch: { purpose: (purpose || null) as ReferencePurpose | null } }, {
      onSuccess: (next) => { onItem(next); toast({ title: 'Reading it again', description: `Now treated as ${PURPOSES.find((p) => p.value === next.purpose)?.label.toLowerCase() ?? 'a document'}.` }); },
      onError: (err) => toast({ title: 'Could not change that', description: describeError(err), variant: 'destructive' }),
      onSettled: () => setBusyId(null),
    });
  };
  const del = (it: ReferenceItem) => {
    setBusyId(it.id);
    remove.mutate(it.id, {
      onSuccess: () => onRemoved(it.id),
      onError: (err) => toast({ title: 'Could not delete it', description: describeError(err), variant: 'destructive' }),
      onSettled: () => setBusyId(null),
    });
  };
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Decks, price lists, case studies, proposals. Tell it what each one is and it pulls out the claims, prices and results it can quote.</p>
        <Button type="button" size="sm" variant="outline" onClick={onAdd} className="hover:border-[#7C5CFF]/50"><Upload className="h-4 w-4" />Add documents</Button>
      </div>
      {docs.length ? (
        <ul className={`mt-3 divide-y ${DIVIDE}`} data-testid="documents">
          {docs.map((it) => {
            const st = STATUS_COPY[it.extraction_status] ?? STATUS_COPY.pending;
            const summary = typeof it.extracted.summary === 'string' ? it.extracted.summary : null;
            return (
              <li key={it.id} className="py-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-medium">{it.title || 'Document'}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.className}`} title={it.extraction_error ?? undefined}>{st.label}</span>
                      {it.kind === 'brand_guide' && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS.info}`}>Brand guide</span>}
                      {it.kb_document_name && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS.optional}`}>Voice agent can search it</span>}
                      {it.size_bytes ? <span className="text-[11px] text-muted-foreground">{fmtBytes(it.size_bytes)}</span> : null}
                    </div>
                    {summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{summary}</p>}
                    {it.extraction_status === 'failed' && it.extraction_error && <p className={`mt-0.5 text-xs ${TINT.neededText}`}>{it.extraction_error}</p>}
                  </div>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => del(it)} aria-label={`Delete ${it.title || 'document'}`} disabled={busyId === it.id}>
                    {busyId === it.id && remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
                {it.kind === 'document' && (
                  <div className="mt-2 flex items-center gap-2 pl-6">
                    <Label htmlFor={`purpose-${it.id}`} className="text-xs text-muted-foreground">This is a</Label>
                    <NativeSelect id={`purpose-${it.id}`} value={it.purpose ?? ''} onChange={(v) => setPurpose(it, v)} options={[{ value: '', label: 'Pick one…' }, ...PURPOSES]} disabled={busyId === it.id} />
                    {busyId === it.id && update.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Nothing yet. Drop files above or tap Add documents.</p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Step                                                                 */
/* ------------------------------------------------------------------ */

export interface ReferencesStepProps {
  onContinue: () => void;
  continuing?: boolean;
}

export default function ReferencesStep({ onContinue, continuing }: ReferencesStepProps) {
  const { toast } = useToast();
  const refs = useReferences();
  const styleQuery = useStyle();
  const uploadDocs = useUploadReferences();
  const uploadLogos = useUploadBrandLogos();
  const uploadGuide = useUploadBrandGuide();
  const [items, setItems] = useState<ReferenceItem[] | null>(null);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [summary, setSummary] = useState<ReferencesSummary | null>(null);
  const [style, setStyle] = useState<StyleProfile | null | undefined>(undefined);
  const [open, setOpen] = useState<TileKey | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!refs.data) return;
    setItems(refs.data.items);
    setBrand(refs.data.brand);
    setSummary(refs.data.summary);
  }, [refs.data]);
  useEffect(() => {
    if (styleQuery.data !== undefined && style === undefined) setStyle(styleQuery.data);
  }, [styleQuery.data, style]);

  const list = useMemo(() => items ?? [], [items]);
  const mergeItems = (add: ReferenceItem[]) => setItems((cur) => {
    const byId = new Map((cur ?? []).map((i) => [i.id, i]));
    for (const it of add) byId.set(it.id, it);
    return Array.from(byId.values());
  });
  const removeItem = (id: string) => setItems((cur) => (cur ?? []).filter((i) => i.id !== id));

  const counts = {
    talk: summary?.conversations ?? style?.sampleCount ?? 0,
    worked: list.filter((i) => i.kind === 'link' || i.kind === 'post').length,
    story: brand?.story ? 1 : 0,
    brand: (brand?.palette.length ?? 0) + (brand?.logos.length ?? 0) + (brand?.fonts.length ?? 0),
    documents: list.filter((i) => i.kind === 'document' || i.kind === 'brand_guide').length,
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    const sorted = sortDrop(files);
    for (const r of sorted.rejected) toast({ title: `Skipped ${r.file.name}`, description: r.why, variant: 'destructive' });
    const parts: string[] = [];
    if (sorted.documents.length) parts.push(`${sorted.documents.length} document${sorted.documents.length === 1 ? '' : 's'}`);
    if (sorted.logos.length) parts.push(`${sorted.logos.length} logo${sorted.logos.length === 1 ? '' : 's'}`);
    if (sorted.guides.length) parts.push(`${sorted.guides.length} brand guide${sorted.guides.length === 1 ? '' : 's'}`);
    if (!parts.length) return;
    setUploading(`Uploading ${parts.join(', ')}…`);
    try {
      for (let i = 0; i < sorted.documents.length; i += UPLOAD_BATCH) {
        const added = await uploadDocs.mutateAsync({ files: sorted.documents.slice(i, i + UPLOAD_BATCH) });
        mergeItems(added);
      }
      if (sorted.logos.length) {
        const nb = await uploadLogos.mutateAsync({ files: sorted.logos.slice(0, 3) });
        setBrand(nb);
      }
      for (const g of sorted.guides) {
        const r = await uploadGuide.mutateAsync({ file: g });
        setBrand(r.brand);
        mergeItems([r.item]);
      }
      toast({ title: 'Sorted', description: `${parts.join(', ')} — ${sorted.documents.length ? 'documents below' : ''}${sorted.documents.length && (sorted.logos.length || sorted.guides.length) ? ', ' : ''}${sorted.logos.length || sorted.guides.length ? 'colours and logo updated' : ''}.` });
      if (sorted.documents.length) setOpen('documents');
      else if (sorted.logos.length || sorted.guides.length) setOpen('brand');
    } catch (err) {
      toast({ title: 'Could not upload', description: describeError(err), variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFiles(Array.from(e.dataTransfer.files ?? []));
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    void handleFiles(files);
  };

  if (refs.isLoading || items === null) {
    if (refs.data === undefined && refs.isError) {
      return (
        <div className="space-y-3">
          <p className={`rounded-2xl border p-4 text-sm ${STATUS.needed}`}>Your references could not load right now. Refresh, or try again in a moment.</p>
          <Button type="button" variant="outline" onClick={() => refs.refetch()}>Try again</Button>
        </div>
      );
    }
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Looking at what you have shared…</div>
        <div className={`${SKELETON} h-28`} />
        <div className={`${SKELETON} h-14`} />
        <div className={`${SKELETON} h-14`} />
      </div>
    );
  }

  const tiles: { key: TileKey; icon: typeof FileText; title: string; hint: string }[] = [
    { key: 'talk', icon: MessagesSquare, title: 'How you talk', hint: 'Real conversations so it sounds like you' },
    { key: 'worked', icon: Trophy, title: 'What worked before', hint: 'Posts and pages that got results' },
    { key: 'story', icon: Sparkles, title: 'Your story and values', hint: 'Why you do this, what you promise' },
    { key: 'brand', icon: Palette, title: 'Colours, logo and fonts', hint: 'So anything it makes looks like yours' },
    { key: 'documents', icon: FileText, title: 'Documents', hint: 'Decks, price lists, case studies' },
  ];
  const summaryLine = summary?.summary ?? brand?.summary ?? null;
  const shared = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className={H_STEP}>Give it your real material, so it sounds like you.</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Drop files, paste links, tell your story. Nothing here is required — every bit makes the messages more yours.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-[20px] border-2 border-dashed p-5 text-center transition-all duration-200 ease-out ${dragging ? 'border-[#7C5CFF] bg-[#7C5CFF]/[.06] shadow-[0_0_0_4px_rgba(124,92,255,.15)] dark:bg-[#7C5CFF]/[.12]' : 'border-slate-300/80 bg-white/60 backdrop-blur hover:border-[#7C5CFF]/50 dark:border-white/15 dark:bg-white/[.03]'}`}
        data-testid="drop-zone"
      >
        <input ref={fileRef} type="file" accept={ACCEPT} multiple className="sr-only" onChange={onPick} aria-label="Files to share" data-testid="drop-input" />
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-[0_6px_18px_-6px_rgba(124,92,255,.7)]"><Upload className="h-5 w-5" aria-hidden /></span>
        <p className="mt-2 text-sm font-medium">Drop anything here — decks, price lists, logos, a brand guide</p>
        <p className="mt-0.5 text-xs text-muted-foreground">It sorts them for you. Up to {MAX_DROP_FILES} files, 20 MB each.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3 hover:border-[#7C5CFF]/50" onClick={() => fileRef.current?.click()} disabled={Boolean(uploading)}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}{uploading ? 'Uploading…' : 'Tap to browse'}
        </Button>
        {uploading && <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">{uploading}</p>}
      </div>

      <div className="space-y-2">
        {tiles.map((t) => (
          <div key={t.key} className="space-y-2">
            <Tile icon={t.icon} title={t.title} hint={t.hint} count={counts[t.key]} open={open === t.key} onOpen={() => setOpen((o) => (o === t.key ? null : t.key))} />
            {open === t.key && t.key === 'talk' && (
              <StyleImport style={style ?? null} onImported={(r) => setStyle(r.style)} heading={null} hint="Five real threads beat five pages of instructions." />
            )}
            {open === t.key && t.key === 'worked' && <WorkedPanel items={list} onItems={mergeItems} onRemoved={removeItem} />}
            {open === t.key && t.key === 'story' && <StoryPanel brand={brand} onBrand={setBrand} onItem={(it) => mergeItems([it])} />}
            {open === t.key && t.key === 'brand' && <BrandPanel brand={brand} onBrand={setBrand} onItem={(it) => mergeItems([it])} />}
            {open === t.key && t.key === 'documents' && (
              <DocumentsPanel items={list} onItem={(it) => mergeItems([it])} onRemoved={removeItem} onAdd={() => fileRef.current?.click()} />
            )}
          </div>
        ))}
      </div>

      <section className={`${CARD} p-4`} data-testid="brand-summary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold tracking-tight">Here&rsquo;s your brand profile.</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Edit anything that looks wrong.</p>
          </div>
          {shared > 0 && <CheckCircle2 className={`h-5 w-5 shrink-0 ${TINT.ready} ${READY_PULSE}`} aria-label="profile has content" />}
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          {summaryLine ?? (shared > 0
            ? 'It is reading what you shared; the summary appears once it is done.'
            : 'Nothing shared yet, so it writes in a neutral voice. Add a few real conversations and it will sound like you.')}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={() => { setOpen(null); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} disabled={continuing} className="w-full hover:border-[#7C5CFF]/50 sm:w-auto">
            <Plus className="h-4 w-4" />Add more
          </Button>
          <Button type="button" size="lg" onClick={onContinue} disabled={continuing || Boolean(uploading)} className={`w-full sm:w-auto ${CTA_PRIMARY}`}>
            {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Looks right, continue
          </Button>
        </div>
      </section>
    </div>
  );
}
