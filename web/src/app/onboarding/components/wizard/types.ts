// R8 Phase 3 - types and step config for the linear signup wizard.

export type WizardStepId = 'welcome' | 'company' | 'icp' | 'review' | 'integrations';

export interface WizardStepConfig {
  id: WizardStepId;
  label: string;
  /** Short helper shown under the step number in the indicator. */
  hint?: string;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 'welcome',      label: 'Welcome',     hint: 'Get started' },
  { id: 'company',      label: 'Company',     hint: 'Tell us about you' },
  { id: 'icp',          label: 'ICP',         hint: 'Describe your ideal customer' },
  { id: 'review',       label: 'Review',      hint: 'Confirm targeting' },
  { id: 'integrations', label: 'Integrations', hint: 'Connect channels' },
];

export function indexOfStep(id: WizardStepId): number {
  const i = WIZARD_STEPS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

export function nextStepId(id: WizardStepId): WizardStepId | null {
  const i = indexOfStep(id);
  return i + 1 < WIZARD_STEPS.length ? WIZARD_STEPS[i + 1].id : null;
}

export function prevStepId(id: WizardStepId): WizardStepId | null {
  const i = indexOfStep(id);
  return i - 1 >= 0 ? WIZARD_STEPS[i - 1].id : null;
}
