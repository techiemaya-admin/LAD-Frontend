/**
 * Two-way sync between the guided campaign-config toggles and the Workflow
 * Builder canvas.
 *
 * The `workflowPreview` steps array is the SINGLE SOURCE OF TRUTH. The guided
 * config's structural selections - the channels (linkedin / email / whatsapp /
 * voice_call), the LinkedIn actions (connect / message / profile_view) and the
 * trigger condition - are DERIVED from it (`deriveConfig`), and editing a
 * toggle reconciles back into it (`applyConfig`). Because both the toggles and
 * the canvas mutate the same array, add/remove in either surface reflects in
 * the other in real time.
 *
 * LinkedIn is a first-class channel here: it is "selected" whenever the workflow
 * carries a LinkedIn outreach step, and its per-action detail lives in
 * `actions`. The other channels map 1:1 to a single step type.
 *
 * Channel account/template selections (email from-address, WA account, voice
 * agent, …) are campaign-level, not per-step, so they stay in their own state
 * and are merged at launch - they are intentionally NOT part of this module.
 *
 * Per-step content (a step's message / delay) lives on the step object and is
 * edited via the canvas StepEditor or the config forms; this module preserves
 * those fields across a reconcile by matching on step type.
 */

export interface SyncStep {
  id: string;
  type: string;
  title: string;
  description?: string;
  channel?: string;
  // Per-step content preserved across reconciles:
  message?: string;
  delayDays?: number;
  delayHours?: number;
  condition?: string; // only on a wait_for_condition step
  leadLimit?: number;  // only on the lead_generation step
  [k: string]: unknown;
}

export interface DerivedConfig {
  actions: string[];        // subset of ['profile_view','connect','message'] (LinkedIn actions)
  nextChannels: string[];   // subset of ['linkedin','email','whatsapp','voice_call']
  triggerCondition: string; // '' | 'connection_accepted' | 'message_replied' | 'profile_visited' | …
}

const LI_ACTION_BY_TYPE: Record<string, string> = {
  linkedin_visit: 'profile_view',
  linkedin_connect: 'connect',
  linkedin_message: 'message',
};

const CHANNEL_BY_TYPE: Record<string, string> = {
  email_send: 'email',
  whatsapp_send: 'whatsapp',
  voice_agent_call: 'voice_call',
};

const TYPE_BY_CHANNEL: Record<string, string> = {
  email: 'email_send',
  whatsapp: 'whatsapp_send',
  voice_call: 'voice_agent_call',
};

/**
 * Step types that are NOT modeled by the guided-config toggles but must SURVIVE
 * a rebuild. buildStepsFromConfig re-derives the array from the toggle config,
 * so any type it doesn't know is silently dropped the moment a toggle changes  - 
 * preserved types are re-inserted at (approximately) their original position.
 */
const PRESERVED_TYPES = new Set(['media_generation']);

const COND_LABELS: Record<string, string> = {
  connection_accepted: 'Wait for Connection Accepted',
  message_replied: 'Wait for Message Reply',
  profile_visited: 'Wait for Profile Visit',
  email_read: 'Wait for Email Read',
  email_replied: 'Wait for Email Reply',
  wa_read: 'Wait for WhatsApp Read',
  wa_replied: 'Wait for WhatsApp Reply',
  call_completed: 'Wait for Call Completed',
  call_answered: 'Wait for Call Answered',
};

/** Read the current structural config back out of the canonical steps array. */
export function deriveConfig(steps: SyncStep[] | null | undefined): DerivedConfig {
  const actions: string[] = [];
  const nextChannels: string[] = [];
  let triggerCondition = '';
  for (const s of steps || []) {
    if (LI_ACTION_BY_TYPE[s.type]) actions.push(LI_ACTION_BY_TYPE[s.type]);
    else if (CHANNEL_BY_TYPE[s.type]) nextChannels.push(CHANNEL_BY_TYPE[s.type]);
    else if (s.type === 'wait_for_condition') triggerCondition = s.condition || '';
  }
  // LinkedIn is a first-class channel in the guided config (selecting it reveals
  // the LinkedIn action toggles). It's "selected" whenever the workflow carries
  // any LinkedIn outreach step; surface it at the FRONT so it reads as the
  // primary channel (matching CHANNEL_PRIORITY = ['linkedin', …]).
  if (actions.length > 0) nextChannels.unshift('linkedin');
  return { actions, nextChannels, triggerCondition };
}

/** Factory for a fresh structural step of a given kind. */
function makeStep(kind: string, existing?: SyncStep): SyncStep {
  if (existing) return existing; // preserve id + per-step content (message/delays/condition)
  switch (kind) {
    case 'lead_generation':
      return { id: 'lead-gen', type: 'lead_generation', title: 'LinkedIn Lead Search', description: 'Find target leads on LinkedIn', channel: 'linkedin' };
    case 'linkedin_connect':
      return { id: 'connect', type: 'linkedin_connect', title: 'Send Connection Request', description: 'Auto-connect with leads on LinkedIn', channel: 'linkedin' };
    case 'linkedin_message':
      return { id: 'message', type: 'linkedin_message', title: 'Send Follow-up Message', description: 'Message after connection accepted', channel: 'linkedin' };
    case 'linkedin_visit':
      return { id: 'profile_view', type: 'linkedin_visit', title: 'View Profile', description: 'Visit their LinkedIn profile', channel: 'linkedin' };
    case 'wait_for_condition':
      return { id: 'condition', type: 'wait_for_condition', title: 'Wait for Condition', description: 'Trigger condition', channel: 'system' };
    case 'email_send':
      return { id: 'ch-email', type: 'email_send', title: 'Send Follow-up Email', description: 'Follow up via email', channel: 'email' };
    case 'whatsapp_send':
      return { id: 'ch-whatsapp', type: 'whatsapp_send', title: 'Send WhatsApp Message', description: 'Follow up via whatsapp', channel: 'whatsapp' };
    case 'voice_agent_call':
      return { id: 'ch-voice_call', type: 'voice_agent_call', title: 'AI Voice Call', description: 'Follow up via voice_call', channel: 'voice' };
    case 'media_generation':
      return { id: 'media-gen', type: 'media_generation', title: 'AI Media', description: 'Generate brand media to attach to outreach', channel: 'media' };
    default:
      return { id: `${kind}-${Math.random().toString(36).slice(2, 8)}`, type: kind, title: kind };
  }
}

/**
 * Rebuild the canonical steps array for a target structural config, PRESERVING
 * every existing step's per-step content (message/delay/condition/leadLimit/id)
 * by matching on type. Channel steps are materialised even without a trigger
 * (the wait_for_condition step is added only when a trigger is set) - this is
 * what lets "channels selected before a trigger" round-trip without loss.
 *
 * Canonical order: lead_generation → LinkedIn actions (connect, message,
 * profile_view) → wait_for_condition (if trigger) → follow-up channels.
 */
export function buildStepsFromConfig(
  cfg: DerivedConfig,
  existing: SyncStep[] = [],
  opts: { includeLeadSource?: boolean } = {},
): SyncStep[] {
  const byType = new Map<string, SyncStep>();
  for (const s of existing) if (!byType.has(s.type)) byType.set(s.type, s);
  const take = (type: string) => makeStep(type, byType.get(type));

  const liSelected = cfg.nextChannels.includes('linkedin');

  const out: SyncStep[] = [];
  // The lead-search node is the campaign's lead SOURCE, not an outreach channel.
  // It's included by default (this page discovers leads via LinkedIn search), but
  // OMITTED for direct-contact / inbound-import campaigns where leads are provided
  // directly (initial_leads) - mirroring the launch builder, which gates the same
  // node on `!isDirectContact && !inboundMode`. Without this the canvas showed a
  // "LinkedIn Lead Search" node those campaigns never actually run.
  if (opts.includeLeadSource !== false) {
    const leadGen = take('lead_generation');
    // When LinkedIn isn't a selected OUTREACH channel, don't title the source
    // node as if it were a LinkedIn action - it reads as "why is LinkedIn here
    // when I picked Email + Voice". Relabel it neutrally (leads are still sourced
    // via LinkedIn search - see the description).
    if (!liSelected) {
      leadGen.title = 'Find Leads';
      leadGen.description = 'Discover target leads via LinkedIn search';
    }
    out.push(leadGen);
  }

  // LinkedIn outreach steps materialise only when the LinkedIn channel is
  // selected. If it's selected with no explicit action, default to a profile
  // visit (mirrors the launch builder's `liChannelActions.length === 0` default).
  const liActions = !liSelected ? [] : (cfg.actions.length > 0 ? cfg.actions : ['profile_view']);
  // Emit in execution order (visit → connect → message) so the canvas matches
  // how the launch builder actually runs the sequence.
  if (liActions.includes('profile_view')) out.push(take('linkedin_visit'));
  if (liActions.includes('connect')) out.push(take('linkedin_connect'));
  if (liActions.includes('message')) out.push(take('linkedin_message'));

  if (cfg.triggerCondition) {
    const cond = take('wait_for_condition');
    cond.condition = cfg.triggerCondition;
    cond.title = COND_LABELS[cfg.triggerCondition] || 'Wait for Condition';
    out.push(cond);
  }

  for (const ch of cfg.nextChannels) {
    if (ch === 'linkedin') continue; // handled via the LinkedIn actions above
    const type = TYPE_BY_CHANNEL[ch];
    if (type) out.push(take(type));
  }

  // Re-insert preserved (toggle-agnostic) steps - e.g. the AI Media node - at
  // their original position, clamped to the rebuilt array. Without this they
  // would vanish from the canvas on the next guided-toggle change.
  existing.forEach((s, i) => {
    if (PRESERVED_TYPES.has(s.type)) out.splice(Math.min(i, out.length), 0, s);
  });

  return out;
}

/** Merge a partial structural change and rebuild the steps. */
export function applyConfig(
  steps: SyncStep[],
  patch: Partial<DerivedConfig>,
  opts: { includeLeadSource?: boolean } = {},
): SyncStep[] {
  const merged = { ...deriveConfig(steps), ...patch };
  return buildStepsFromConfig(merged, steps, opts);
}

export const _internal = { LI_ACTION_BY_TYPE, CHANNEL_BY_TYPE, TYPE_BY_CHANNEL, COND_LABELS, PRESERVED_TYPES };
