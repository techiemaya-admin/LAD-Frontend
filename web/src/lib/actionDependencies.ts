/**
 * Action Dependencies Configuration
 * 
 * Defines which actions depend on other actions for each platform.
 * When a required action is unchecked, dependent actions are automatically removed.
 */
export interface ActionDependency {
  platform: string;
  requiredAction: string | RegExp; // Action that must be selected
  dependentAction: string | RegExp; // Action that depends on requiredAction
}
/**
 * Action dependencies for all platforms
 */
export const ACTION_DEPENDENCIES: ActionDependency[] = [
  // LinkedIn: "Send message (after accepted)" requires "Send connection request"
  {
    platform: 'linkedin',
    requiredAction: /send connection request|connection request/i,
    dependentAction: /send message.*after accepted|message.*after accepted/i,
  },
  // WhatsApp: "Follow-up message" requires an initial message (broadcast or 1:1)
  {
    platform: 'whatsapp',
    requiredAction: /send broadcast|send 1:1 message|send.*message/i,
    dependentAction: /follow-up message|follow up message/i,
  },
  // Email: "Email follow-up sequence" requires "Send email"
  {
    platform: 'email',
    requiredAction: /send email/i,
    dependentAction: /email follow-up sequence|follow-up sequence|follow up sequence/i,
  },
  // Voice: Follow-up actions require "Trigger call" (if we add follow-up actions later)
  // Currently voice only has "Trigger call" and "Use call script", no follow-ups
];
/**
 * Get dependent actions that should be removed when a required action is unchecked
 */
export function getDependentActionsToRemove(
  platform: string,
  uncheckedAction: string,
  allOptions: string[]
): string[] {
  const dependencies = ACTION_DEPENDENCIES.filter(dep => dep.platform === platform.toLowerCase());
  const actionsToRemove: string[] = [];
  for (const dep of dependencies) {
    // Check if the unchecked action is a required action
    const isRequiredAction = typeof dep.requiredAction === 'string'
      ? uncheckedAction.toLowerCase().includes(dep.requiredAction.toLowerCase())
      : dep.requiredAction.test(uncheckedAction);
    if (isRequiredAction) {
      // Find all dependent actions that should be removed
      for (const option of allOptions) {
        const isDependentAction = typeof dep.dependentAction === 'string'
          ? option.toLowerCase().includes(dep.dependentAction.toLowerCase())
          : dep.dependentAction.test(option);
        if (isDependentAction) {
          actionsToRemove.push(option);
        }
      }
    }
  }
  return actionsToRemove;
}
/**
 * Check if an action requires another action to be selected
 * Returns the actual option strings from the available options that are required
 */
export function getRequiredActionsFromOptions(
  platform: string,
  action: string,
  allOptions: string[]
): string[] {
  const dependencies = ACTION_DEPENDENCIES.filter(dep => dep.platform === platform.toLowerCase());
  const requiredActions: string[] = [];
  for (const dep of dependencies) {
    // Check if this action is a dependent action
    const isDependentAction = typeof dep.dependentAction === 'string'
      ? action.toLowerCase().includes(dep.dependentAction.toLowerCase())
      : dep.dependentAction.test(action);
    if (isDependentAction) {
      // Find the required action option from allOptions
      for (const option of allOptions) {
        const isRequiredAction = typeof dep.requiredAction === 'string'
          ? option.toLowerCase().includes(dep.requiredAction.toLowerCase())
          : dep.requiredAction.test(option);
        if (isRequiredAction) {
          requiredActions.push(option);
        }
      }
    }
  }
  return requiredActions;
}