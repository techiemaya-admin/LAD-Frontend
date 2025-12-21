// Updated question sequences for AI-driven onboarding
export const questionSequences = {
  automation: [
    {
      key: 'platforms',
      question: 'Which platforms do you want to automate? (You can select multiple)',
      type: 'multi-select',
      options: [
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Email', value: 'email' },
        { label: 'Voice Agent', value: 'voice' },
        { label: 'All of the above', value: 'all' },
      ],
    },
  ],
  leads: [
    {
      key: 'leadManagementType',
      question: 'Would you like Inbound or Outbound lead management?',
      type: 'select',
      options: [
        { label: 'Inbound', value: 'inbound' },
        { label: 'Outbound', value: 'outbound' },
      ],
    },
  ],
};

// Platform-specific feature questions (dynamically generated)
export function getPlatformFeaturesQuestion(platform: string) {
  const platformLabels: Record<string, string> = {
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    email: 'Email',
    voice: 'Voice Agent',
  };

  return {
    key: `features_${platform}`,
    question: `Which ${platformLabels[platform] || platform} features do you want? (You can select multiple)`,
    type: 'multi-select',
    platform,
  };
}

// Utility questions for each feature
export function getUtilityQuestions() {
  return [
    {
      key: 'schedule',
      question: 'When should this run?',
      type: 'select',
      options: [
        { label: 'Immediately', value: 'immediate' },
        { label: 'Schedule (one-time)', value: 'schedule' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Custom schedule', value: 'custom' },
      ],
    },
    {
      key: 'delay',
      question: 'Add delay before next step?',
      type: 'select',
      options: [
        { label: 'No delay', value: 'none' },
        { label: 'Hours (specify)', value: 'hours' },
        { label: 'Days (specify)', value: 'days' },
      ],
    },
    {
      key: 'condition',
      question: 'Add condition?',
      type: 'select',
      options: [
        { label: 'No condition', value: 'none' },
        { label: 'If connected', value: 'if_connected' },
        { label: 'If opened', value: 'if_opened' },
        { label: 'If replied', value: 'if_replied' },
        { label: 'If clicked', value: 'if_clicked' },
      ],
    },
    {
      key: 'variables',
      question: 'Personalization variables needed? (Select all that apply)',
      type: 'multi-select',
      options: [
        { label: 'first_name', value: 'first_name' },
        { label: 'company_name', value: 'company_name' },
        { label: 'title', value: 'title' },
        { label: 'email', value: 'email' },
        { label: 'None', value: 'none' },
      ],
    },
  ];
}

