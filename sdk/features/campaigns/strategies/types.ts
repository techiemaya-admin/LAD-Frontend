/**
 * Strategies - saved + shareable workflow playbooks.
 *
 * A Strategy is a persisted `WorkflowTemplate`: the serialized state of the
 * CustomWorkflowBuilder (source + nodes + per-node configs). Storing the
 * builder's own shape - rather than the campaign payload `launch()` emits  - 
 * is what lets a saved strategy flow back through the existing
 * `applyTemplate()` path with no second apply implementation.
 *
 * Backend: LAD_backend/features/campaigns (routes/strategies.js).
 */

/** A node inside a stored strategy. Mirrors `TemplateNode` in workflowTemplates.ts. */
export interface StrategyNode {
  type: string;
  /** Fixed macro id (EXPORT_STEP_ID, AUTOPOST_STEP_ID, …); absent for outreach steps. */
  macroId?: string;
  title?: string;
  description?: string;
  cfg?: Record<string, any>;
}

/** The serialized builder state. Shaped to convert cleanly to a WorkflowTemplate. */
export interface StrategyDefinition {
  version: number;
  source?: {
    key: string;
    title?: string;
    description?: string;
    cfg?: Record<string, any>;
  };
  nodes: StrategyNode[];
  /** Set when the playbook's source is a file import - the importer supplies their own file. */
  requiresFile?: boolean;
  meta?: {
    cycleDays?: number;
    channels?: number;
    perDay?: number;
    days?: number;
  };
}

export type StrategyShareStatus =
  | 'private'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

/** A strategy owned by the current tenant (carries the private definition). */
export interface Strategy {
  id: string;
  tenant_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  definition: StrategyDefinition;
  node_types: string[];
  share_status: StrategyShareStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  origin_strategy_id: string | null;
  import_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * A strategy published by another tenant. Deliberately narrower than
 * `Strategy` - the API never returns the author's private definition,
 * tenant, or reviewer for a shared row.
 */
export interface SharedStrategy {
  id: string;
  name: string;
  description: string | null;
  shared_definition: StrategyDefinition;
  node_types: string[];
  import_count: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

/** One field the sanitizer removed, shown in the publish confirmation. */
export interface StrategyRemoval {
  /** e.g. "nodes[2]:whatsapp_send" or "source" */
  path: string;
  key: string;
  reason: string;
}

/** A node type that will not behave as expected once imported. */
export interface StrategyWarning {
  type: string;
  reason: string;
}

/** Dry run of publish - what would leave the account, and what wouldn't. */
export interface PublishPreview {
  shared_definition: StrategyDefinition;
  removed: StrategyRemoval[];
  warnings: StrategyWarning[];
}

export interface CreateStrategyInput {
  name: string;
  description?: string;
  definition: StrategyDefinition;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  definition?: StrategyDefinition;
}

export interface ImportStrategyResult {
  strategy: Strategy;
  warnings: StrategyWarning[];
}
