/**
 * The shape GET /api/snapshot/pipelines returns.
 *
 * Mirrors pipelineActivationService.getPipelineOverview, which sends the knob
 * DEFINITIONS alongside the values — "the form to render, and the values to
 * render it with". That is why this screen is generic: a new knob in the
 * manifest appears here without a frontend change.
 */

/** Every type knobSchema.js declares. All nine are in use in wellness. */
export type KnobType =
  | 'text' | 'textarea' | 'number' | 'boolean'
  | 'select' | 'multiselect' | 'phone' | 'time' | 'list';

export interface KnobDefinition {
  key: string;
  label: string;
  type: KnobType;
  help?: string;
  options?: string[];
  default?: unknown;
  maxLength?: number;
  maxItems?: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

export type KnobValue = string | number | boolean | string[] | null;

export interface Pipeline {
  key: string;
  name: string;
  blurb: string;
  engine: string | null;
  goal: string | null;
  /** 'live' | 'planned' — a planned pipeline has no prompt content behind it. */
  state: string | null;
  entitled: boolean;
  active: boolean;
  campaignCount: number;
  knobs: KnobDefinition[];
  knobValues: Record<string, KnobValue>;
}

export interface PipelineOverview {
  vertical: string | null;
  version: string | null;
  pipelines: Pipeline[];
}
