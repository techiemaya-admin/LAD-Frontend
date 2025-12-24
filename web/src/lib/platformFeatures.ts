// Platform-specific features mapping
export const PLATFORM_FEATURES = {
  linkedin: [
    { id: 'linkedin_profile_visit', label: 'Profile Visit', description: 'Visit the lead\'s LinkedIn profile' },
    { id: 'linkedin_follow', label: 'Follow', description: 'Follow the lead on LinkedIn' },
    { id: 'linkedin_connect', label: 'Connection Request', description: 'Send a connection request with message' },
    { id: 'linkedin_message', label: 'LinkedIn Message', description: 'Send a message (only if connected)' },
    { id: 'linkedin_scrape_profile', label: 'Scrape Profile', description: 'Scrape LinkedIn profile data' },
    { id: 'linkedin_company_search', label: 'Company Search', description: 'Search for company on LinkedIn' },
    { id: 'linkedin_autopost', label: 'Auto-post', description: 'Automatically post content to LinkedIn' },
    { id: 'linkedin_comment_reply', label: 'Reply-to-comments', description: 'Automatically reply to comments' },
  ],
  instagram: [
    { id: 'instagram_autopost', label: 'Auto-post', description: 'Automatically post content to Instagram' },
    { id: 'instagram_dm', label: 'Auto-DM', description: 'Send automated direct messages' },
    { id: 'instagram_comment_reply', label: 'Auto-comment', description: 'Automatically comment on posts' },
    { id: 'instagram_comment_reply', label: 'Reply-to-comments', description: 'Reply to comments automatically' },
    { id: 'instagram_comment_monitor', label: 'Comment Monitoring', description: 'Monitor and reply to comments' },
  ],
  whatsapp: [
    { id: 'whatsapp_broadcast', label: 'Send Broadcast', description: 'Send broadcast message to multiple contacts' },
    { id: 'whatsapp_send', label: 'Send 1:1 Message', description: 'Send individual WhatsApp message' },
    { id: 'whatsapp_followup', label: 'Follow-up Message', description: 'Send follow-up message' },
    { id: 'whatsapp_template', label: 'Template Message', description: 'Send template-based message' },
  ],
  email: [
    { id: 'email_send', label: 'Send Email', description: 'Send email to leads' },
    { id: 'email_followup', label: 'Email Follow-up', description: 'Send follow-up email sequence' },
    { id: 'email_track', label: 'Track Opens / Clicks', description: 'Track email engagement metrics' },
    { id: 'email_bounce', label: 'Bounced Detection', description: 'Detect and handle bounced emails' },
  ],
  voice: [
    { id: 'voice_agent_call', label: 'Trigger Call', description: 'Trigger automated voice call' },
    { id: 'voice_agent_script', label: 'Call Script', description: 'Use predefined call script' },
  ],
};

export const UTILITY_QUESTIONS = {
  schedule: {
    question: 'When should this run?',
    options: [
      { label: 'Immediately', value: 'immediate' },
      { label: 'Schedule (one-time)', value: 'schedule' },
      { label: 'Daily', value: 'daily' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'Custom schedule', value: 'custom' },
    ],
  },
  delay: {
    question: 'Add delay before next step?',
    options: [
      { label: 'No delay', value: 'none' },
      { label: 'Hours (specify)', value: 'hours' },
      { label: 'Days (specify)', value: 'days' },
    ],
  },
  condition: {
    question: 'Add condition?',
    options: [
      { label: 'No condition', value: 'none' },
      { label: 'If connected', value: 'if_connected' },
      { label: 'If opened', value: 'if_opened' },
      { label: 'If replied', value: 'if_replied' },
      { label: 'If clicked', value: 'if_clicked' },
    ],
  },
  variables: {
    question: 'Personalization variables needed?',
    options: [
      { label: 'first_name', value: 'first_name' },
      { label: 'company_name', value: 'company_name' },
      { label: 'title', value: 'title' },
      { label: 'email', value: 'email' },
      { label: 'None', value: 'none' },
    ],
    multiSelect: true,
  },
};

export type Platform = keyof typeof PLATFORM_FEATURES;
export type PlatformFeature = typeof PLATFORM_FEATURES[Platform][number];

