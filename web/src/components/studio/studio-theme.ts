/**
 * studio-theme — the one visual system every Tenant Studio surface reads from.
 *
 * Class-string constants only: no behaviour, no props. Every colour has a
 * dark twin (the app's dark mode is `.dark` on <html>, see
 * contexts/ThemeContext.tsx) and reads on the dashboard's `#000724` page /
 * `#071131` card as well as on white. The AI accent (electric blue → violet
 * → magenta) matches the gradient tiles used elsewhere in the app; nothing
 * here invents a third look.
 *
 * Motion is limited to 150–200 ms ease-out and a 1 px lift; the keyframes
 * (`studio.css`) honour `prefers-reduced-motion`.
 */

/** Electric blue → violet → magenta. Progress fill, primary CTAs, active chips. Text on it is white. */
export const AI_GRADIENT = 'bg-gradient-to-r from-[#2B7CFF] via-[#7C5CFF] to-[#C049FF]';

/** Soft blue/violet halo for hover/focus of primary CTAs and the active agent tile. */
export const AI_GLOW = 'shadow-[0_0_0_1px_rgba(43,124,255,.25),0_8px_30px_-8px_rgba(124,92,255,.45)] dark:shadow-[0_0_0_1px_rgba(43,124,255,.35),0_8px_34px_-8px_rgba(124,92,255,.7)]';

/** Gradient text: the step percent, the "Mr LAD" name, the title word-mark accent. */
export const AI_TEXT = 'bg-gradient-to-r from-[#2B7CFF] to-[#C049FF] bg-clip-text text-transparent';

/** Every card, section and tile. */
export const CARD = 'rounded-[20px] border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-blue-950/40 dark:bg-[#071131]/90';

/** A CARD that is open / selected / the active room. */
export const CARD_ACTIVE = `${CARD} ring-1 ring-[#7C5CFF]/40 dark:ring-[#7C5CFF]/60 ${AI_GLOW}`;

/** A CARD that lifts 1 px and glows on hover (clickable tiles). */
export const CARD_HOVER = 'transition-all duration-200 ease-out hover:-translate-y-px hover:border-[#7C5CFF]/40 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none dark:hover:border-[#7C5CFF]/50';

/** A muted inner panel inside a CARD (fastest-path sections, editors, quoted context). */
export const PANEL = 'rounded-2xl border border-slate-200/70 bg-slate-50/70 dark:border-white/10 dark:bg-white/[.04]';

/** The page backdrop: a soft radial aurora behind the shell. Never a flat white page. */
export const SURFACE = 'bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(43,124,255,.12),transparent),radial-gradient(900px_500px_at_100%_0%,rgba(192,73,255,.10),transparent)] dark:bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(43,124,255,.22),transparent),radial-gradient(900px_500px_at_100%_0%,rgba(192,73,255,.18),transparent)]';

/** Primary CTA: the AI gradient, white text, glow on hover/focus, 1 px lift. */
export const CTA_PRIMARY = `${AI_GRADIENT} border-0 text-white hover:text-white hover:-translate-y-px focus-visible:ring-[#7C5CFF]/60 transition-all duration-200 ease-out motion-reduce:transform-none hover:shadow-[0_0_0_1px_rgba(43,124,255,.25),0_8px_30px_-8px_rgba(124,92,255,.45)] focus-visible:shadow-[0_0_0_1px_rgba(43,124,255,.25),0_8px_30px_-8px_rgba(124,92,255,.45)] dark:hover:shadow-[0_0_0_1px_rgba(43,124,255,.35),0_8px_34px_-8px_rgba(124,92,255,.7)] disabled:hover:translate-y-0 disabled:hover:shadow-none`;

/** Status tints — semantic pairs, each with a dark twin. Body text ≥ 4.5:1 in both themes. */
export const STATUS = {
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  needed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  warn: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/30',
  optional: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10',
} as const;

/** Icon / inline text tints that pair with STATUS. */
export const TINT = {
  ready: 'text-emerald-600 dark:text-emerald-400',
  needed: 'text-rose-600 dark:text-rose-400',
  warn: 'text-amber-600 dark:text-amber-400',
  warnText: 'text-amber-800 dark:text-amber-300',
  info: 'text-sky-700 dark:text-sky-300',
  neededText: 'text-rose-700 dark:text-rose-300',
  readyText: 'text-emerald-700 dark:text-emerald-300',
} as const;

/** A row background for a "needed" checklist line. */
export const ROW_NEEDED = 'bg-amber-50/60 dark:bg-amber-500/[.07]';

/** Chips: idle vs selected. */
export const CHIP_IDLE = 'border-slate-200 bg-white text-slate-700 hover:border-[#7C5CFF]/50 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
export const CHIP_SELECTED = `${AI_GRADIENT} border-transparent text-white shadow-[0_4px_14px_-4px_rgba(124,92,255,.55)]`;
export const CHIP_BASE = 'inline-flex items-center rounded-full border font-medium transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50';

/** Focus ring for inputs and textareas (shadcn defaults stay; only the ring colour changes). */
export const INPUT_FOCUS = 'focus-visible:ring-[#7C5CFF]/60 focus-visible:border-[#7C5CFF]/60';

/** Per-channel avatar gradients (initials on white). */
export const CHANNEL_GRADIENT: Record<'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'voice', string> = {
  email: 'bg-gradient-to-br from-sky-500 to-blue-600',
  whatsapp: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  instagram: 'bg-gradient-to-br from-pink-500 to-orange-500',
  linkedin: 'bg-gradient-to-br from-[#2B7CFF] to-[#7C5CFF]',
  voice: 'bg-gradient-to-br from-violet-500 to-fuchsia-600',
};

/** An avatar that is switched off. */
export const AVATAR_OFF = 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400';

/** An initials avatar: white bold text on a channel gradient. */
export const AVATAR = 'flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,.25)]';

/** OFF agent tiles are dimmed; ON ones are CARD_ACTIVE. */
export const TILE_OFF = 'opacity-70 grayscale-[.3]';

/** The 1-shot pulse on a ready tick (see studio.css). */
export const READY_PULSE = 'studio-ready-pulse';

/** Gradient skeleton shimmer for loading / empty states (see studio.css). */
export const SKELETON = 'studio-skeleton rounded-xl';

/** The icon tile in section headers: the app's purple→blue AI tile. */
export const ICON_TILE = 'inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(124,92,255,.6)]';

/** Timeline dots by history kind. */
export const HISTORY_DOT: Record<'overlay' | 'prompt' | 'first_campaign' | 'brief' | 'go_live', string> = {
  overlay: 'bg-violet-500 text-white shadow-[0_0_0_4px_rgba(139,92,246,.18)] dark:shadow-[0_0_0_4px_rgba(139,92,246,.3)]',
  prompt: 'bg-[#2B7CFF] text-white shadow-[0_0_0_4px_rgba(43,124,255,.18)] dark:shadow-[0_0_0_4px_rgba(43,124,255,.3)]',
  first_campaign: 'bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,.18)] dark:shadow-[0_0_0_4px_rgba(16,185,129,.3)]',
  brief: 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,.18)] dark:shadow-[0_0_0_4px_rgba(14,165,233,.3)]',
  go_live: 'bg-amber-500 text-white shadow-[0_0_0_4px_rgba(245,158,11,.18)] dark:shadow-[0_0_0_4px_rgba(245,158,11,.3)]',
};

/** The vertical gradient rail behind the timeline dots. */
export const HISTORY_RAIL = 'bg-gradient-to-b from-[#2B7CFF] via-[#7C5CFF] to-[#C049FF] opacity-40 dark:opacity-60';

/** Banner rails: left border in the matching status colour. */
export const BANNER = {
  base: `${CARD} border-l-4 px-4 py-3 text-sm`,
  ready: 'border-l-emerald-500 text-emerald-900 dark:text-emerald-200',
  warn: 'border-l-amber-500 text-amber-900 dark:text-amber-200',
  info: 'border-l-[#2B7CFF] text-sky-950 dark:text-sky-100',
  neutral: 'border-l-slate-300 text-muted-foreground dark:border-l-white/20',
} as const;

/** The AI-gradient left rail (the "drafted" banner). */
export const BANNER_AI_RAIL = 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-[20px] before:bg-gradient-to-b before:from-[#2B7CFF] before:via-[#7C5CFF] before:to-[#C049FF]';

/** Chat bubbles in the rehearsal, tailor and test-run rooms. */
export const BUBBLE_ME = `${AI_GRADIENT} text-white shadow-[0_4px_14px_-6px_rgba(124,92,255,.6)]`;
export const BUBBLE_AGENT = 'bg-slate-100 text-slate-900 dark:bg-white/[.07] dark:text-slate-100';

/** Inline link in the accent colour. */
export const LINK = 'font-medium text-blue-600 underline-offset-2 transition-colors duration-150 hover:text-[#7C5CFF] hover:underline dark:text-[#8FB5FF] dark:hover:text-[#B69CFF]';

/** Small headings: keep the app font, tighten tracking. */
export const H_STEP = 'text-2xl font-semibold leading-snug tracking-tight sm:text-3xl';
export const H_CARD = 'font-semibold tracking-tight';

/** The rooms tabs: a pill rail; the active tab is the AI gradient. */
export const TAB_LIST = 'h-auto min-h-10 max-w-full flex-wrap gap-1 rounded-full border border-slate-200/80 bg-white/70 p-1 backdrop-blur dark:border-white/10 dark:bg-white/5';
export const TAB_TRIGGER = 'h-8 flex-none rounded-full px-3 transition-all duration-200 ease-out data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2B7CFF] data-[state=active]:via-[#7C5CFF] data-[state=active]:to-[#C049FF] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_14px_-4px_rgba(124,92,255,.6)] dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-gradient-to-r dark:data-[state=active]:text-white';

/** Divider colour that works on both card backgrounds. */
export const DIVIDE = 'divide-slate-200/80 dark:divide-white/10';
export const BORDER = 'border-slate-200/80 dark:border-white/10';
