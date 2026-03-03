/**
 * Parse options from AI message content
 * Detects patterns like:
 * - "Options:\n• LinkedIn\n• Email"
 * - "Options:\n* LinkedIn\n* Email"
 * - "Options:\n- LinkedIn\n- Email"
 */
export interface ParsedOptions {
  options: string[];
  multiSelect: boolean;
  allowSkip: boolean;
  questionText: string; // Text without the options section
  stepType?: 'platform_selection' | 'platform_actions' | 'delay' | 'condition' | 'template_input' | 'campaign_goal' | 'campaign_settings';
  platformName?: string; // For platform_actions
  platformIndex?: number; // For platform_actions (e.g., "Platform 1 of 2")
  totalPlatforms?: number; // For platform_actions
  subStepType?: 'campaign_days' | 'working_days'; // For campaign_settings
  preSelectedOptions?: string[]; // Pre-selected options (for platform actions)
  leadsPerDayOptions?: boolean; // For lead volume selection warning/single select
}
export function parseMessageOptions(message: string): ParsedOptions | null {
  if (!message || typeof message !== 'string') {
    return null;
  }
  // First, convert literal \n to actual newlines for structure parsing
  const withNewlines = message.replace(/\\n/g, '\n');
  const messageLower = withNewlines.toLowerCase();
  // Check if message contains "Options:" keyword
  const optionsMatch = withNewlines.match(/Options?:/i);
  // If no "Options:" keyword, check if it's a platform actions question that might have options in examples
  if (!optionsMatch) {
    // Check if it's a platform actions question with examples
    const isPlatformActionsQuestion = (
      messageLower.includes('what linkedin actions') ||
      messageLower.includes('what email actions') ||
      messageLower.includes('what whatsapp actions') ||
      messageLower.includes('what voice call actions') ||
      messageLower.includes('which linkedin actions') ||
      messageLower.includes('which email actions') ||
      messageLower.includes('which whatsapp actions') ||
      messageLower.includes('which voice call actions') ||
      (messageLower.includes('actions') && (messageLower.includes('linkedin') || messageLower.includes('email') || messageLower.includes('whatsapp') || messageLower.includes('voice')))
    );
    if (isPlatformActionsQuestion) {
      // Extract platform name
      const platformMatch = message.match(/(linkedin|email|whatsapp|voice)/i);
      const platformKey = platformMatch ? platformMatch[1].toLowerCase() : '';
      // Known platform actions (from backend GeminiIntentService.js)
      const platformActionsMap: Record<string, string[]> = {
        linkedin: ['Visit profile', 'Follow profile', 'Send connection request', 'Send message (after accepted)'],
        email: ['Send email', 'Email follow-up sequence', 'Track opens/clicks', 'Bounce detection'],
        whatsapp: ['Send broadcast', 'Send 1:1 message', 'Follow-up message', 'Template message'],
        voice: ['Trigger call', 'Use call script'],
      };
      const knownOptions = platformActionsMap[platformKey] || [];
      // Try to extract options from examples in parentheses or after "e.g."
      const exampleMatch = message.match(/\(e\.g\.\s*([^)]+)\)/i) || message.match(/examples?:\s*([^\.]+)/i);
      let options = knownOptions;
      if (exampleMatch && knownOptions.length === 0) {
        // If we don't have known options, try to extract from examples
        const exampleText = exampleMatch[1];
        const extractedOptions = exampleText
          .split(',')
          .map(opt => opt.trim())
          .filter(opt => opt.length > 0);
        if (extractedOptions.length > 0) {
          options = extractedOptions;
        }
      }
      // Only return if we have options to show
      if (options.length > 0) {
        // Extract platform index
        const platformIndexMatch = message.match(/platform\s+(\d+)\s+of\s+(\d+)/i);
        let platformIndex: number | undefined;
        let totalPlatforms: number | undefined;
        if (platformIndexMatch) {
          platformIndex = parseInt(platformIndexMatch[1], 10);
          totalPlatforms = parseInt(platformIndexMatch[2], 10);
        }
        // Clean question text - remove clarification prefixes and examples
        let cleanQuestionText = message
          .replace(/^it looks like[^!]+!?\s*/i, '') // Remove "It looks like..." prefix
          .replace(/^for this step,?\s*/i, '') // Remove "For this step," prefix
          .replace(/please tell me\s*/i, '') // Remove "please tell me"
          .split('(')[0] // Remove everything after first parenthesis
          .split('e.g.')[0] // Remove everything after "e.g."
          .trim();
        // If question text is too short, use a default
        if (cleanQuestionText.length < 10) {
          cleanQuestionText = `What ${platformKey.charAt(0).toUpperCase() + platformKey.slice(1)} actions do you want to include?`;
        }
        // Check if message says "pre-selected" or "all actions are pre-selected"
        const isPreSelected = messageLower.includes('pre-selected') || 
                             messageLower.includes('all actions are pre-selected') ||
                             messageLower.includes('all') && messageLower.includes('pre-selected');
        return {
          options,
          multiSelect: true, // Platform actions are always multi-select
          allowSkip: false,
          questionText: cleanQuestionText,
          stepType: 'platform_actions',
          platformName: platformKey,
          platformIndex,
          totalPlatforms,
          preSelectedOptions: isPreSelected ? options : undefined, // Pre-select all if mentioned
        };
      }
    }
    // If still no options found, return null
    return null;
  }
  // Split message into question and options sections
  const optionsIndex = withNewlines.indexOf(optionsMatch[0]);
  const questionText = withNewlines
    .substring(0, optionsIndex)
    .replace(/\\n/g, '')  // Remove any remaining literal \n
    .replace(/\n/g, '')   // Remove actual newlines
    .trim();
  const optionsSection = withNewlines.substring(optionsIndex + optionsMatch[0].length).trim();
  // Extract options (support bullet points: •, *, -, or numbered)
  const optionLines = optionsSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Match bullet points or numbered lists
      return /^[•\*\-]\s+/.test(line) || /^\d+\.\s+/.test(line);
    })
    .map(line => {
      // Remove bullet point markers and clean all forms of \n
      return line
        .replace(/^[•\*\-]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/\\n/g, '')  // Remove literal \n
        .replace(/\n/g, '')   // Remove actual newlines
        .trim();
    })
    .filter(line => line.length > 0 && !line.toLowerCase().includes('modify your selection')); // Filter out helper text
  // Check for multi-select hint
  const multiSelectKeywords = ['multiple', 'choose multiple', 'select multiple', 'one or more', 'any'];
  const multiSelect = multiSelectKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  const isLeadsPerDay = /leads per day|leads do you want per day|connect with daily/i.test(messageLower);
  // Skip is no longer allowed - all questions are required
  const allowSkip = false;
  if (optionLines.length === 0) {
    return null;
  }
  // Detect step type from message content
  let stepType: ParsedOptions['stepType'];
  let platformName: string | undefined;
  let platformIndex: number | undefined;
  let totalPlatforms: number | undefined;
  let subStepType: ParsedOptions['subStepType'];
  let preSelectedOptions: string[] | undefined;
  // Platform selection (Step 4)
  if (messageLower.includes('which platforms') || messageLower.includes('platforms do you want')) {
    stepType = 'platform_selection';
  }
  // Platform actions (Step 5)
  else if (messageLower.includes('actions do you want') || messageLower.includes('actions would you like') || messageLower.includes('what linkedin actions') || messageLower.includes('what email actions') || messageLower.includes('what whatsapp actions') || messageLower.includes('what voice call actions') || messageLower.includes('all') && messageLower.includes('actions are pre-selected')) {
    stepType = 'platform_actions';
    // Extract platform name (e.g., "What LinkedIn actions" -> "linkedin")
    const platformMatch = message.match(/(linkedin|email|whatsapp|voice|instagram)/i);
    if (platformMatch) {
      platformName = platformMatch[1].toLowerCase();
    }
    // Extract "Platform X of Y" pattern
    const platformIndexMatch = message.match(/platform\s+(\d+)\s+of\s+(\d+)/i);
    if (platformIndexMatch) {
      platformIndex = parseInt(platformIndexMatch[1], 10);
      totalPlatforms = parseInt(platformIndexMatch[2], 10);
    }
    // Check if message says "pre-selected" or "all actions are pre-selected"
    const isPreSelected = messageLower.includes('pre-selected') || 
                         messageLower.includes('all actions are pre-selected') ||
                         (messageLower.includes('all') && messageLower.includes('pre-selected'));
    // If pre-selected, pre-select ALL options
    if (isPreSelected && optionLines.length > 0) {
      preSelectedOptions = [...optionLines]; // Pre-select all extracted options
    }
  }
  // Delay (Step 6)
  else if (messageLower.includes('delay') || messageLower.includes('wait time') || (messageLower.includes('how long') && messageLower.includes('delay'))) {
    stepType = 'delay';
  }
  // Condition (Step 7)
  else if (messageLower.includes('condition') || (messageLower.includes('if') && (messageLower.includes('accepted') || messageLower.includes('replied') || messageLower.includes('opened') || messageLower.includes('clicked')))) {
    stepType = 'condition';
  }
  // Template input
  else if (messageLower.includes('please provide the message template') || 
           messageLower.includes('please provide the call script') ||
           messageLower.includes('provide the message template') ||
           messageLower.includes('provide the call script') ||
           (messageLower.includes('template') && messageLower.includes('you\'d like to use')) ||
           (messageLower.includes('script') && messageLower.includes('you\'d like to use'))) {
    stepType = 'template_input';
  }
  // Campaign goal (Step 8)
  else if (messageLower.includes('main goal') || messageLower.includes('goal of this campaign')) {
    stepType = 'campaign_goal';
  }
  // Campaign settings (Step 10)
  else if (messageLower.includes('campaign duration') || messageLower.includes('how many days should this campaign run') || messageLower.includes('which days should the campaign run') || messageLower.includes('working days')) {
    stepType = 'campaign_settings';
    if (messageLower.includes('how many days should this campaign run') || messageLower.includes('campaign duration')) {
      subStepType = 'campaign_days';
    } else if (messageLower.includes('which days should') || messageLower.includes('working days')) {
      subStepType = 'working_days';
    }
  }
  return {
    options: optionLines,
    multiSelect: isLeadsPerDay ? false : multiSelect,
    allowSkip,
    questionText,
    stepType,
    platformName,
    platformIndex,
    totalPlatforms,
    subStepType,
    preSelectedOptions,
    leadsPerDayOptions: isLeadsPerDay,
  };
}
