/**
 * The Mr LAD discovery script — 8 phases, 20 questions, ~26 minutes.
 *
 * This module is the single source of truth for the script, the fixed scoring
 * options and the record's column order. The column order is a contract: new
 * fields append, existing positions never move, so a sheet built on last
 * quarter's export still lines up with a record written today.
 */

export interface ScriptQuestion {
  id: string;
  col: string;
  text: string;
}

export interface PhaseScore {
  id: string;
  col: string;
  label: string;
  note?: string;
  /** [option label, tone] — tone 3 = strongest signal, 1 = weakest. */
  opts: [string, 1 | 2 | 3][];
}

export interface ScriptPhase {
  key: string;
  name: string;
  mins: number;
  why: string;
  qs: ScriptQuestion[];
  score: PhaseScore;
  worksheet?: boolean;
}

export const PHASES: ScriptPhase[] = [
  {
    key: 'discovery',
    name: 'Discovery',
    mins: 4,
    why: 'Get the shape of how leads actually arrive before you diagnose anything.',
    qs: [
      { id: 'q1', col: 'Q1 How They Find You', text: 'Walk me through how a new customer usually finds you and reaches out today.' },
      { id: 'q2', col: 'Q2 Volume And Channels', text: 'In a normal week, how many people get in touch, and which channels do they come through — WhatsApp, Instagram, phone, walk-in, email?' },
      { id: 'q3', col: 'Q3 Who Replies And Speed', text: 'Once someone messages you, who picks it up, and how long does a reply usually take?' },
    ],
    score: { id: 'channelFit', col: 'Channel Fit', label: 'Channel fit', opts: [['Strong', 3], ['Partial', 2], ['Weak', 1]] },
  },
  {
    key: 'pain',
    name: 'Pain points',
    mins: 5,
    why: 'Their number, in their words. Do not supply it for them.',
    qs: [
      { id: 'q4', col: 'Q4 Where Leads Go Quiet', text: 'Where do enquiries most often go quiet or get lost?' },
      { id: 'q5', col: 'Q5 Leads Lost Per Month', text: 'In a month, roughly how many people stop replying or never hear back from you?' },
      { id: 'q6', col: 'Q6 Cost Of That', text: 'What is that costing you — in deals you lost, or in hours you spend chasing?' },
    ],
    score: {
      id: 'painScore', col: 'Pain Score', label: 'Pain score', note: '5 = urgent, actively losing money',
      opts: [['1', 1], ['2', 1], ['3', 2], ['4', 3], ['5', 3]],
    },
  },
  {
    key: 'process',
    name: 'Current process',
    mins: 4,
    why: 'What they already run tells you what Mr LAD has to slot beside.',
    qs: [
      { id: 'q7', col: 'Q7 How They Track Leads', text: 'What do you use today to keep track of who has enquired and where each one stands?' },
      { id: 'q8', col: 'Q8 Who Follows Up', text: 'Talk me through what happens after the first reply — who follows up, and how do they remember to?' },
      { id: 'q9', col: 'Q9 Past Automation', text: 'Have you tried any automation or AI tool before, and how did that go?' },
    ],
    score: { id: 'setupReadiness', col: 'Setup Readiness', label: 'Setup readiness', opts: [['Ready', 3], ['Needs work', 2], ['Messy', 1]] },
  },
  {
    key: 'dm',
    name: 'Decision makers',
    mins: 2,
    why: 'Find the second person now, not in week three.',
    qs: [
      { id: 'q10', col: 'Q10 Others In Decision', text: 'Apart from you, who else would want a say before you bring something like this in?' },
      { id: 'q11', col: 'Q11 Daily Users', text: 'Who on the team would be using it every day, and how comfortable are they with new tools?' },
    ],
    score: { id: 'decisionPath', col: 'Decision Path', label: 'Decision path', opts: [['Single owner', 3], ['Two or more', 2], ['Unclear', 1]] },
  },
  {
    key: 'budget',
    name: 'Budget',
    mins: 3,
    why: 'Anchor on what they already spend losing leads, not on your price.',
    qs: [
      { id: 'q12', col: 'Q12 Current Spend', text: 'What are you spending a month right now on getting leads in — ads, agencies, or someone’s salary to chase follow ups?' },
      { id: 'q13', col: 'Q13 Comfortable Range', text: 'If this brought back even two or three deals a month, what monthly range would feel comfortable to you?' },
    ],
    score: { id: 'budgetFit', col: 'Budget Fit', label: 'Budget fit', opts: [['Yes', 3], ['Stretch', 2], ['No', 1]] },
  },
  {
    key: 'costing',
    name: 'Customisation',
    mins: 4,
    why: 'Scope it against the number they just gave you, not after the call.',
    qs: [
      { id: 'q18', col: 'Q18 Tools To Connect', text: 'Which of the tools you already use would this need to talk to, and what should pass between them?' },
      { id: 'q19', col: 'Q19 Bespoke Needs', text: 'What would it need to do that is particular to how you run things — something an off-the-shelf tool would get wrong?' },
      { id: 'q20', col: 'Q20 Who Maintains Systems', text: 'Who looks after those systems for you today, and how would we get access when the time comes?' },
    ],
    score: { id: 'buildEffort', col: 'Build Effort', label: 'Build effort', opts: [['Standard', 3], ['Moderate', 2], ['Heavy', 1]] },
    worksheet: true,
  },
  {
    key: 'timeline',
    name: 'Timeline',
    mins: 2,
    why: 'A date with nothing behind it is not a date.',
    qs: [
      { id: 'q14', col: 'Q14 Go Live Date And Driver', text: 'When would you want this live and working, and what is driving that date — a season, an event, a new launch?' },
      { id: 'q15', col: 'Q15 What Unblocks This Month', text: 'What would have to happen for you to start this month?' },
    ],
    score: { id: 'urgency', col: 'Urgency', label: 'Urgency', opts: [['Now', 3], ['This quarter', 2], ['Someday', 1]] },
  },
  {
    key: 'next',
    name: 'Next steps',
    mins: 2,
    why: 'Name the fear before they turn it into an objection at the door.',
    qs: [
      { id: 'q16', col: 'Q16 Concerns About AI Replies', text: 'What is still unclear, or sitting uneasy with you, about replies going out under your name?' },
      { id: 'q17', col: 'Q17 What They Want To See Next', text: 'What would you want to see next to feel confident moving ahead?' },
    ],
    score: { id: 'leadScore', col: 'Lead Score', label: 'Lead score', opts: [['Hot', 3], ['Warm', 2], ['Cold', 1]] },
  },
];

export interface CostLine { id: string; name: string; hint: string }
export interface CostGroup { key: string; name: string; unit: 'days' | 'monthly'; lines: CostLine[] }

const line = (id: string, name: string, hint: string): CostLine => ({ id, name, hint });

export const COST_GROUPS: CostGroup[] = [
  {
    key: 'channels', name: 'Channels to connect', unit: 'days', lines: [
      line('ch_waba', 'WhatsApp Business API', 'Number, Meta verification, templates'),
      line('ch_wapa', 'WhatsApp personal number', 'Device linking, no template approval'),
      line('ch_li', 'LinkedIn account', 'Connection, limits, warm-up'),
      line('ch_ig', 'Instagram / Meta inbox', 'Business account, permissions'),
      line('ch_email', 'Email mailbox', 'OAuth, sending domain'),
      line('ch_voice', 'Voice agent', 'Number, script, handoff'),
    ],
  },
  {
    key: 'systems', name: 'Their systems and data', unit: 'days', lines: [
      line('sy_zoho', 'Zoho CRM sync', 'Two-way contacts and activity'),
      line('sy_crm', 'HubSpot or another CRM', 'Field mapping both ways'),
      line('sy_import', 'Import their contact list', 'CSV or Excel, header mapping'),
      line('sy_site', 'Website or booking system', 'Enquiry form, calendar'),
      line('sy_erp', 'ERP or POS', 'Orders, stock, customer records'),
      line('sy_pay', 'Invoicing or payments', 'Quotes, credit terms'),
    ],
  },
  {
    key: 'build', name: 'Agent build', unit: 'days', lines: [
      line('bd_tone', 'Agent tone and rules per channel', 'What it may and may not say'),
      line('bd_profile', 'Business profile and assets', 'Brochures, price lists, links'),
      line('bd_book', 'Booking or scheduling flow', 'Slots, confirmations, reminders'),
      line('bd_qual', 'Qualification and handoff rules', 'When a human takes over'),
      line('bd_report', 'Reports or dashboard changes', 'What they want to see weekly'),
      line('bd_clean', 'Data migration and cleanup', 'Deduping, formatting numbers'),
    ],
  },
  {
    key: 'ongoing', name: 'Every month', unit: 'monthly', lines: [
      line('mo_sub', 'Mr LAD subscription', 'Seats and channels'),
      line('mo_usage', 'Message and credit usage', 'Meta fees, enrichment, LLM'),
      line('mo_support', 'Support and tuning', 'Prompt changes, new campaigns'),
    ],
  },
];

export const HEAD_FIELDS: [string, string][] = [
  ['date', 'Date'], ['prospectName', 'Prospect Name'], ['company', 'Company'],
  ['industry', 'Industry'], ['source', 'Source'], ['callLength', 'Call Length'],
  ['othersOnCall', 'Others On Call'],
];

export const CLOSE_FIELDS: [string, string][] = [
  ['agreedNextAction', 'Agreed Next Action'], ['nextActionDate', 'Next Action Date'],
  ['owner', 'Owner'], ['objections', 'Objections Raised'],
];

export const COST_FIELDS: [string, string][] = [
  ['costCurrency', 'Currency'], ['costDayRate', 'Day Rate'],
  ['costSetupDays', 'Setup Days'], ['costSetupTotal', 'Setup Cost'],
  ['costMonthlyTotal', 'Monthly Cost'], ['costTheirMonthly', 'Monthly They Named'],
  ['costGap', 'Monthly Gap'], ['costLines', 'Costing Lines'],
];

export const SOURCE_OPTIONS = ['BNI referral', 'Demo completed', 'Inbound', 'Other'];

/** Call order runs costing at phase 6; the record carries it at the end. */
const COLUMN_PHASE_ORDER = ['discovery', 'pain', 'process', 'dm', 'budget', 'timeline'];

export const COLUMNS: [string, string][] = (() => {
  const cols: [string, string][] = [...HEAD_FIELDS];
  const byKey = Object.fromEntries(PHASES.map(p => [p.key, p]));
  const emit = (key: string) => {
    const p = byKey[key];
    if (!p) return;
    p.qs.forEach(q => cols.push([q.id, q.col]));
    if (p.key !== 'next') cols.push([p.score.id, p.score.col]);
  };
  COLUMN_PHASE_ORDER.forEach(emit);
  emit('next');
  CLOSE_FIELDS.forEach(f => cols.push(f));
  cols.push(['leadScore', 'Lead Score']);
  cols.push(['followUpNotes', 'Follow Up Notes']);
  emit('costing');
  COST_FIELDS.forEach(f => cols.push(f));
  return cols;
})();

export const ALL_QUESTIONS = PHASES.flatMap(p => p.qs);
export const TOTAL_BUDGET_SECONDS = PHASES.reduce((a, p) => a + p.mins, 0) * 60;
export const SCORE_BY_ID: Record<string, PhaseScore> =
  Object.fromEntries(PHASES.map(p => [p.score.id, p.score]));

export type CostSelection = Record<string, { on: boolean; v: string }>;
export type Answers = Record<string, string>;

export function toneOf(scoreId: string, value?: string): 0 | 1 | 2 | 3 {
  const sc = SCORE_BY_ID[scoreId];
  if (!sc || !value) return 0;
  const hit = sc.opts.find(o => o[0] === value);
  return hit ? hit[1] : 0;
}

export function toNumber(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function costTotals(answers: Answers, costing: CostSelection) {
  const rate = toNumber(answers.costDayRate);
  let days = 0;
  let monthly = 0;
  COST_GROUPS.forEach(g => g.lines.forEach(l => {
    const c = costing[l.id];
    if (!c?.on) return;
    if (g.unit === 'days') days += toNumber(c.v);
    else monthly += toNumber(c.v);
  }));
  return { days, setup: days * rate, monthly, rate };
}

export function costSummaryText(costing: CostSelection): string {
  const out: string[] = [];
  COST_GROUPS.forEach(g => g.lines.forEach(l => {
    const c = costing[l.id];
    if (!c?.on) return;
    out.push(`${l.name} (${toNumber(c.v)}${g.unit === 'days' ? 'd' : '/mo'})`);
  }));
  return out.join('; ');
}

/** Suggested lead score. Advisory only — the rep still picks. */
export function leadHint(answers: Answers): string {
  const pain = parseInt(answers.painScore || '0', 10);
  const bud = answers.budgetFit;
  const urg = answers.urgency;
  if (!pain || !bud || !urg) return 'Set pain score, budget fit and urgency and the suggested score appears here.';
  if (pain >= 4 && (bud === 'Yes' || bud === 'Stretch') && urg === 'Now') {
    return `Hot — pain ${pain}, budget ${bud.toLowerCase()}, wants it now.`;
  }
  if (pain >= 4) {
    return `Warm — the pain is real (${pain}/5) but ${bud === 'No' ? 'the budget is not' : `the timing is ${urg.toLowerCase()}`}. Worth a nurture.`;
  }
  if (pain <= 2) return `Cold — pain is only ${pain}/5. Friendly call, no bleeding problem. This is the referral trap.`;
  return `Warm — middling pain (${pain}/5). Follow up on what would make it urgent.`;
}

export function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
