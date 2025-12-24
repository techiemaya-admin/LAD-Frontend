// Category-based feature filtering
// Ensures strict category isolation (RULE 2, RULE 3, RULE 6)

export type WorkflowCategory = 
  | 'leadops' 
  | 'socialops' 
  | 'crm_sync' 
  | 'whatsapp_automation' 
  | 'analytics';

// Features allowed per category
const LEADOPS_ALLOWED_FEATURES = [
  'linkedin_profile_visit',
  'linkedin_follow',
  'linkedin_connect',
  'linkedin_message',
  'linkedin_scrape_profile',
  'linkedin_company_search',
  'instagram_dm',
  'whatsapp_broadcast',
  'whatsapp_send',
  'whatsapp_followup',
  'whatsapp_template',
  'email_send',
  'email_followup',
  'email_track',
  'email_bounce',
  'voice_agent_call',
  'voice_agent_script',
];

const SOCIALOPS_ALLOWED_FEATURES = [
  'linkedin_autopost',
  'linkedin_comment_reply',
  'instagram_autopost',
  'instagram_comment_reply',
  'instagram_comment_monitor',
];

const WHATSAPP_AUTOMATION_ALLOWED_FEATURES = [
  'whatsapp_broadcast',
  'whatsapp_send',
  'whatsapp_followup',
  'whatsapp_template',
];

// Features FORBIDDEN per category
const LEADOPS_FORBIDDEN_FEATURES = [
  'linkedin_autopost',
  'linkedin_comment_reply',
  'instagram_autopost',
  'instagram_comment_reply',
  'instagram_comment_monitor',
];

const SOCIALOPS_FORBIDDEN_FEATURES = [
  'linkedin_profile_visit',
  'linkedin_follow',
  'linkedin_connect',
  'linkedin_message',
  'linkedin_scrape_profile',
  'linkedin_company_search',
  'email_send',
  'email_followup',
];

// LinkedIn platform restrictions (RULE 3)
const LINKEDIN_FORBIDDEN_FEATURES = [
  'linkedin_autopost', // No posting on LinkedIn
  'linkedin_comment_reply', // No auto-commenting (unless SocialOps)
];

/**
 * Filter features based on category and platform restrictions
 */
export function filterFeaturesByCategory(
  features: Array<{ id: string; label: string; description: string }>,
  category: WorkflowCategory | null,
  platform: string
): Array<{ id: string; label: string; description: string }> {
  if (!category) {
    return features; // No filtering if no category selected
  }

  let allowedFeatures: string[] = [];
  let forbiddenFeatures: string[] = [];

  // Apply category-based filtering
  switch (category) {
    case 'leadops':
      allowedFeatures = LEADOPS_ALLOWED_FEATURES;
      forbiddenFeatures = LEADOPS_FORBIDDEN_FEATURES;
      break;
    case 'socialops':
      allowedFeatures = SOCIALOPS_ALLOWED_FEATURES;
      forbiddenFeatures = SOCIALOPS_FORBIDDEN_FEATURES;
      break;
    case 'whatsapp_automation':
      allowedFeatures = WHATSAPP_AUTOMATION_ALLOWED_FEATURES;
      forbiddenFeatures = []; // All non-WhatsApp features are forbidden
      break;
    case 'crm_sync':
    case 'analytics':
      // These categories don't use platform features
      return [];
  }

  // Apply LinkedIn platform restrictions (RULE 3)
  if (platform === 'linkedin') {
    // If LeadOps, forbid posting features
    if (category === 'leadops') {
      forbiddenFeatures = [...forbiddenFeatures, ...LINKEDIN_FORBIDDEN_FEATURES];
    }
  }

  // Filter features
  return features.filter(feature => {
    // If category has allowed list, only show those
    if (allowedFeatures.length > 0 && !allowedFeatures.includes(feature.id)) {
      return false;
    }
    
    // Never show forbidden features
    if (forbiddenFeatures.includes(feature.id)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Check if a feature is allowed for the given category and platform
 */
export function isFeatureAllowed(
  featureId: string,
  category: WorkflowCategory | null,
  platform: string
): boolean {
  if (!category) return true;
  
  const allFeatures = [
    ...LEADOPS_ALLOWED_FEATURES,
    ...SOCIALOPS_ALLOWED_FEATURES,
    ...WHATSAPP_AUTOMATION_ALLOWED_FEATURES,
  ];
  
  // Get feature from all features
  const feature = { id: featureId, label: '', description: '' };
  const filtered = filterFeaturesByCategory([feature], category, platform);
  
  return filtered.length > 0;
}

