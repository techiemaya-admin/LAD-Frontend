/**
 * Strategy ⇄ builder-state adapter.
 *
 * A Strategy stores the CustomWorkflowBuilder's own state rather than the
 * campaign payload `launch()` emits. That choice is what lets a saved strategy
 * be restored through the SAME `applyTemplate()` the built-in recipes use —
 * one apply path, no second implementation to keep in sync.
 *
 * These are pure functions on purpose: the round trip has a couple of
 * genuinely load-bearing details (macro ids, router ids) that are much easier
 * to test here than through the 1700-line component.
 */
import type {
  StrategyDefinition,
  StrategyNode,
} from '@lad/frontend-features/campaigns';

import {
  MACRO_STEP_IDS,
  ROUTER_ID_PREFIX,
  SOURCE_STEP_ID,
  type TemplateSourceKey,
  type WorkflowTemplate,
} from './workflowTemplates';

/** Source keys the builder can actually restore (mirrors its SOURCES list). */
const KNOWN_SOURCE_KEYS: TemplateSourceKey[] = [
  'zoho_recurring', 'zoho_once', 'ghl_once', 'linkedin_search', 'linkedin_signal', 'file_import',
];

const MACRO_ID_SET = new Set(MACRO_STEP_IDS);

/** Prefix marking a template key as a saved strategy rather than a built-in. */
export const OWN_STRATEGY_PREFIX = 'strategy:';
export const SHARED_STRATEGY_PREFIX = 'shared-strategy:';

export const isStrategyKey = (key: string) =>
  key.startsWith(OWN_STRATEGY_PREFIX) || key.startsWith(SHARED_STRATEGY_PREFIX);

/** Recover the strategy id from a synthesized template key. */
export const strategyIdFromKey = (key: string) =>
  key.startsWith(OWN_STRATEGY_PREFIX) ? key.slice(OWN_STRATEGY_PREFIX.length)
    : key.startsWith(SHARED_STRATEGY_PREFIX) ? key.slice(SHARED_STRATEGY_PREFIX.length)
      : null;

/**
 * Is this node's canvas id meaningful enough that it must survive a round trip?
 *
 * Two cases: fixed macro ids (drawers + launch look configs up by them) and
 * router ids (a router is `type: 'condition'` identified ONLY by its `rt-`
 * prefix — regenerate it and the router silently becomes a wait-for-condition).
 * Ordinary outreach steps carry no meaning in their id and get fresh ones.
 */
export const idIsLoadBearing = (id: string) =>
  MACRO_ID_SET.has(id) || id.startsWith(ROUTER_ID_PREFIX);

interface BuilderState {
  source: string | null;
  workflowPreview: Array<{ id: string; type: string; title?: string; description?: string }>;
  configs: Record<string, any>;
  perDay?: string | number;
  days?: string | number;
}

/**
 * Snapshot the builder's current state as a storable definition.
 *
 * Note what is NOT captured: `fileRows` / `fileMapping`. Uploaded contact rows
 * are data, not strategy — they'd bloat every row and are the last thing that
 * should ride along if the strategy is later shared. A file-import strategy is
 * marked `requiresFile` and the importer supplies their own list.
 */
export function builderStateToDefinition(state: BuilderState): StrategyDefinition {
  const { source, workflowPreview, configs, perDay, days } = state;

  const nodes: StrategyNode[] = workflowPreview
    .filter((s) => s.id !== SOURCE_STEP_ID)
    .map((s) => ({
      type: s.type,
      ...(idIsLoadBearing(s.id) ? { macroId: s.id } : {}),
      title: s.title,
      description: s.description,
      cfg: configs[s.id] ? { ...configs[s.id] } : {},
    }));

  const channels = new Set(
    nodes.map((n) => (n.type || '').split('_')[0]).filter(Boolean),
  );

  return {
    version: 1,
    ...(source
      ? {
        source: {
          key: source,
          cfg: configs[SOURCE_STEP_ID] ? { ...configs[SOURCE_STEP_ID] } : {},
        },
      }
      : {}),
    nodes,
    ...(source === 'file_import' ? { requiresFile: true } : {}),
    meta: {
      perDay: Number(perDay) || undefined,
      days: Number(days) || undefined,
      cycleDays: Number(days) || undefined,
      channels: channels.size || undefined,
    },
  };
}

/** Short chip label for a node type, used for the card's pipeline preview. */
function chipLabel(type: string): string {
  if (type === 'lead_generation') return 'Source';
  if (type === 'linkedin_connect') return 'LI connect';
  if (type === 'linkedin_message') return 'LI message';
  if (type === 'linkedin_inmail') return 'LI InMail';
  if (type === 'linkedin_visit') return 'LI visit';
  if (type === 'linkedin_post') return 'LI post';
  if (type === 'instagram_post') return 'IG post';
  if (type === 'human_task') return 'Human task';
  if (type === 'lead_report') return 'Audit report';
  if (type.startsWith('linkedin')) return 'LinkedIn';
  if (type.startsWith('email')) return 'Email';
  if (type.startsWith('whatsapp')) return 'WhatsApp';
  if (type.startsWith('instagram')) return 'Instagram';
  if (type === 'voice_agent_call') return 'Voice';
  if (type === 'followup_sequence' || type === 'followup') return 'Follow-ups';
  if (type === 'ai_parse') return 'AI agent';
  if (type === 'data_enrich') return 'Enrich';
  if (type === 'web_scrape') return 'Scrape';
  if (type === 'web_research') return 'Research';
  if (type === 'lead_score') return 'Score';
  if (type === 'media_generation') return 'AI media';
  if (type === 'export_results') return 'Export';
  if (type === 'analytics_report') return 'Report';
  if (type === 'landing_page') return 'Landing page';
  if (type === 'zoho_update') return 'CRM';
  if (type === 'switch' || type === 'multicondition') return 'Branch';
  if (type === 'condition') return 'Wait';
  return 'Step';
}

interface StrategyLike {
  id: string;
  name: string;
  description?: string | null;
  node_types?: string[];
}

/**
 * Present a stored strategy as a `WorkflowTemplate` so it can flow through the
 * existing gallery card renderer, overview drawer and `applyTemplate()` with no
 * special-casing anywhere downstream.
 *
 * `inputs` is empty — the chat wizard's question flow only applies to built-in
 * recipes; a saved strategy is applied to the canvas and edited there.
 */
export function definitionToTemplate(
  strategy: StrategyLike,
  definition: StrategyDefinition,
  opts: { shared?: boolean } = {},
): WorkflowTemplate | null {
  const rawKey = definition?.source?.key;
  const sourceKey = KNOWN_SOURCE_KEYS.includes(rawKey as TemplateSourceKey)
    ? (rawKey as TemplateSourceKey)
    : null;
  // applyTemplate resolves the source against SOURCES with a non-null
  // assertion, so an unrecognised key would crash the builder. Skip the card
  // instead — a strategy we cannot apply should not be offered.
  if (!sourceKey) return null;

  const nodes = Array.isArray(definition.nodes) ? definition.nodes : [];
  const accent = opts.shared ? '#7c3aed' : '#0b1957';

  return {
    key: `${opts.shared ? SHARED_STRATEGY_PREFIX : OWN_STRATEGY_PREFIX}${strategy.id}`,
    name: strategy.name,
    tagline: strategy.description || (opts.shared ? 'Shared by another team' : 'Your saved strategy'),
    chain: ['Source', ...nodes.map((n) => chipLabel(n.type))],
    source: {
      key: sourceKey,
      cfg: definition.source?.cfg || {},
      title: definition.source?.title || 'Contact source',
      description: definition.source?.description || '',
    },
    nodes: nodes.map((n) => ({
      type: n.type as WorkflowTemplate['nodes'][number]['type'],
      ...(n.macroId ? { macroId: n.macroId } : {}),
      title: n.title || chipLabel(n.type),
      description: n.description || '',
      cfg: n.cfg || {},
    })),
    inputs: [],
    ...(definition.requiresFile ? { requiresFile: true } : {}),
    accent,
    ...(opts.shared
      ? { badge: { label: 'Community', tone: 'violet' as const } }
      : {}),
    meta: {
      cycleDays: definition.meta?.cycleDays || definition.meta?.days || 30,
      channels: definition.meta?.channels || 1,
    },
    // Saved strategies are their own gallery groups, not built-in categories.
    category: opts.shared ? 'community' : 'strategy',
  };
}
