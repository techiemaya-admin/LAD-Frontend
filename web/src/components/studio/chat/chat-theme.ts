/**
 * chat-theme — the Studio chat wears the AI Assistant's clothes.
 *
 * Every value here mirrors an `.adv-*` rule in
 * app/onboarding/advanced-search-ai/page.tsx (the assistant's inline
 * stylesheet), so the two conversations read as one product: navy owner
 * bubble (`#0b1957`, `#2563eb` in dark), the LAD logo + "LAD IN ACTION" label
 * with a green dot, assistant prose without a bubble, pill option buttons
 * (first one filled), a white / `#000724` surface with no gradient.
 */

/** The page behind the thread — `.adv-chat-root`. */
export const CHAT_SURFACE = 'bg-white text-gray-900 dark:bg-[#000724] dark:text-white';

/** The messages column — `.adv-msgs-inner` (80%, centred). */
export const CHAT_COLUMN = 'mx-auto w-full max-w-[80%] px-2.5 lg:max-w-[1040px]';

/** Owner bubble — `.adv-user-msg` (+ `.dark`). */
export const OWNER_BUBBLE = 'max-w-full rounded-[20px_20px_4px_20px] bg-[#0b1957] px-[18px] py-3 text-[14.5px] font-[450] leading-[1.65] text-white shadow-[0_2px_14px_rgba(11,25,87,.2)] dark:bg-[#2563eb] dark:shadow-[0_2px_14px_rgba(37,99,235,.3)]';

/** The owner's initial beside their bubble. */
export const OWNER_AVATAR = 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#172560] text-[13px] font-bold text-white';

/** The "LAD IN ACTION" label — `.adv-ai-name` + `.adv-ai-name-dot`. */
export const LAD_NAME = 'mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-[#0b1957] dark:text-[#60a5fa]';
export const LAD_NAME_DOT = 'inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-[0_0_0_2px_rgba(16,185,129,.2)]';

/** Assistant prose — `.adv-ai-text`: no bubble, just text. */
export const LAD_TEXT = 'text-[14px] leading-[1.6] text-[#374151] dark:text-[#e5e7eb]';
export const LAD_BODY = 'min-w-0 max-w-[90%] flex-1';

/** Option / action buttons — `.adv-opt-btn`; `OPT_PRIMARY` is its `:first-child`. */
export const OPT_BTN = 'rounded-[14px] border-[1.5px] px-5 py-2.5 text-[13.5px] font-semibold transition-all duration-150 disabled:cursor-default';
export const OPT_IDLE = 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#0b1957] hover:bg-[#f2f6fa] hover:text-[#0b1957] dark:border-[#1e293b] dark:bg-[#1A2A43] dark:text-white dark:hover:bg-[#253456]';
export const OPT_PRIMARY = 'border-[#0b1957] bg-[#0b1957] text-white shadow-[0_2px_8px_rgba(11,25,87,.25)] hover:border-[#0a1447] hover:bg-[#0a1447] hover:shadow-[0_4px_14px_rgba(11,25,87,.35)] dark:border-[#2B7CFF] dark:bg-[#2B7CFF] dark:text-[#000724] dark:hover:bg-[#1e5fa8]';
export const OPT_MUTED = 'border-[#e5e7eb] bg-white text-[#9ca3af] dark:border-[#1e293b] dark:bg-[#1A2A43]/60 dark:text-slate-400';

/** Cards inside a turn (plan, launch, review) — the assistant's card surface. */
export const CHAT_CARD = 'rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,.08)] dark:border-gray-700 dark:bg-[#1A2A43]';
export const CHAT_CARD_DIVIDE = 'divide-gray-100 dark:divide-gray-700';
export const CHAT_CARD_TITLE = 'text-[12px] font-bold text-[#0b1957] dark:text-blue-300';

/** The composer — `.adv-chat-input-box`. */
export const COMPOSER_BOX = 'rounded-[24px] border-[1.5px] border-[#e5e7eb] bg-white shadow-[0_2px_12px_rgba(11,25,87,.06)] focus-within:border-[#0b1957] dark:border-[rgba(23,37,84,.4)] dark:bg-[#071131] dark:focus-within:border-[#2B7CFF]';
export const SEND_CIRCLE = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b1957] text-white transition-all duration-150 hover:bg-[#0a1447] disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] dark:bg-[#2B7CFF] dark:text-[#000724] dark:hover:bg-[#1e5fa8] dark:disabled:bg-[#1A2A43] dark:disabled:text-slate-500';

/** The rotating "Thinking…" line — `.adv-thinking-word`. */
export const THINKING_WORD = 'text-[13px] font-medium italic tracking-[.01em] text-[#0b1957] dark:text-[#60a5fa]';
export const THINKING_WORDS = ['Thinking', 'Reading', 'Checking', 'Working'];

/** The voice-chat pill above the composer — the Grok "Voice chat" pill on the assistant's surface. */
export const VOICE_PILL = 'rounded-[18px] bg-[#f3f4f6] px-3 py-2 text-gray-900 shadow-[0_1px_6px_rgba(11,25,87,.06)] dark:bg-[#1A2A43] dark:text-white';
/** Below `sm` the pill leaves the 80% column (`CHAT_COLUMN`) for the full width: 80% × 1.25 = 100%. */
export const VOICE_PILL_BREAKOUT = 'max-sm:-ml-[12.5%] max-sm:w-[125%]';
export const VOICE_PILL_ICON = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-default';
/** Exclusive colour sets (never both — Tailwind resolves clashes by stylesheet order, not class order). */
export const VOICE_PILL_ICON_IDLE = 'bg-white text-[#0b1957] dark:bg-[#0b1957] dark:text-white';
export const VOICE_PILL_ICON_ACTIVE = 'bg-[#0b1957] text-white dark:bg-[#2B7CFF] dark:text-[#000724]';
/** The composer's waveform button (starts / ends the session); `_LIVE` while one runs. */
export const VOICE_BTN = 'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40';
export const VOICE_BTN_IDLE = 'text-gray-400 hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/10';
export const VOICE_BTN_LIVE = 'bg-[#0b1957] text-white hover:bg-[#0a1447] dark:bg-[#2B7CFF] dark:text-[#000724] dark:hover:bg-[#1e5fa8]';
