// Vertical snapshot types - the curated workspace's Pipelines surface.

/** The four pipelines a vertical snapshot ships. */
export type PipelineKey =
  | 'customer-support'
  | 'admin-support'
  | 'revenue-growth'
  | 'lead-gen';

/** Which execution engine runs a pipeline. Display only. */
export type PipelineEngine = 'stage' | 'sequence';

/** The knob types a snapshot manifest may declare. */
export type KnobType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'phone'
  | 'time'
  | 'list';

export type KnobOption = string | { value: string; label: string };

export interface KnobDefinition {
  key: string;
  label: string;
  type: KnobType;
  help?: string;
  required?: boolean;
  default?: unknown;
  /** select / multiselect */
  options?: KnobOption[];
  /** number */
  min?: number;
  max?: number;
  integer?: boolean;
  /** text / textarea */
  maxLength?: number;
  /** list */
  maxItems?: number;
}

export type KnobValues = Record<string, unknown>;

export interface SnapshotPipeline {
  key: PipelineKey;
  name: string;
  blurb: string;
  engine: PipelineEngine | null;
  /** The pipeline's goal event, e.g. 'rebooked'. */
  goal: string | null;
  /** Build state from the snapshot manifest, e.g. 'planned' | 'live'. */
  state: string | null;
  /**
   * Whether the workspace is ENTITLED to this pipeline. Admin-controlled - the
   * on/off switch on the page cannot change this.
   */
  entitled: boolean;
  /** Whether the tenant has switched it on. Only meaningful when entitled. */
  active: boolean;
  campaignCount: number;
  /** The settings form to render - shared knobs first, then this pipeline's. */
  knobs: KnobDefinition[];
  /**
   * Current values, already resolved through the schema (manifest defaults
   * overlaid with what the tenant set). Contains only knobs this snapshot
   * version declares - values stored by a newer version are kept server-side
   * but deliberately not returned.
   */
  knobValues: KnobValues;
}

export interface PipelineOverview {
  /** null for a tenant outside a snapshot - the page renders a neutral state. */
  vertical: string | null;
  version: string | null;
  pipelines: SnapshotPipeline[];
}

// ── Knob proposals: settings read out of the tenant's own history ──────────

/**
 * Where a proposed value was read from. Not decoration - it decides how much
 * the value should be trusted:
 *
 *   prompt            the studio wrote this themselves. Highest trust.
 *   customer_message  what customers ask. Shows demand, never establishes a fact.
 *   agent_message     the agent's own past output. Lowest trust, because a
 *                     hallucination reads exactly like a fact. Server caps
 *                     these at 0.5 confidence whatever the model claimed.
 */
export type ProposalSource = 'prompt' | 'customer_message' | 'agent_message';

export interface KnobProposal {
  key: string;
  label: string;
  type: KnobType;
  /** The proposed value, already validated against the knob's own schema. */
  value: unknown;
  /** What the setting holds today, so the reviewer sees a change, not a value. */
  currentValue: unknown;
  /** 0..1. */
  confidence: number;
  source: ProposalSource;
  /** The verbatim quote this was read from. Never empty - unsourced proposals
   *  are dropped server-side. */
  evidence: string;
  /** Set when the sources disagreed, describing the disagreement. */
  conflict: string | null;
  /** True when the source was the agent quoting itself, or a conflict exists. */
  needsCloserReview: boolean;
}

export interface KnobProposalsResult {
  proposals: KnobProposal[];
  /** Values the server refused, with the reason. Shown as a count, not a list. */
  rejected: Array<{ key?: string; why: string }>;
  scanned: {
    conversations: number;
    prompts: number;
    usedSamples?: boolean;
  };
  /** Present when nothing could be read at all. */
  error?: string;
}

/**
 * A conversation offered as a sample to read settings from.
 *
 * Shaped from the existing conversations list rather than a new endpoint  - 
 * these are the same rows the Conversations page shows, and the ids are the
 * same `conversations.id` the extractor reads by.
 */
export interface SampleConversation {
  id: string;
  /** Contact name, falling back to the phone number. */
  name: string;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string | null;
  /** The stage it reached, e.g. 'booking_completed'. Null when unknown. */
  stage: string | null;
}

/**
 * What the server found inside an uploaded WhatsApp export, before any
 * reading happens. Exists so the studio can mark which participant is THEM  - 
 * the extractor trusts the studio's side like their written instructions, so
 * a wrong mapping produces confident settings attributed to the wrong side.
 */
export interface TranscriptPreview {
  participants: Array<{ name: string; messageCount: number }>;
  messageCount: number;
  /** Timestamped lines that were nobody speaking (encryption notices etc.). */
  systemLines: number;
  /** "<Media omitted>" and similar placeholders, dropped. */
  skipped: number;
}
