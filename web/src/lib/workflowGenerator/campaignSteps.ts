/**
 * Campaign Steps Generator
 * 
 * Generates full campaign steps with complete configs for backend processing
 */
import { logger } from '@/lib/logger';
import { buildLeadGenerationFilters } from './utils';
/**
 * Generate full campaign steps from mapped ICP answers
 * This includes complete step configs with all required properties for backend processing
 * Used when creating campaigns programmatically (e.g., from chat ICP onboarding)
 */
export function generateCampaignSteps(mappedAnswers: Record<string, any>): Array<{ type: string; order: number; title: string; description: string; config: Record<string, any> }> {
  logger.debug('Generating campaign steps from answers', { mappedAnswers });
  const steps: Array<{ type: string; order: number; title: string; description: string; config: Record<string, any> }> = [];
  let order = 0;
  // Extract platforms and actions
  const platforms = mappedAnswers.platforms || [];
  // Convert single string to array if needed
  let platformArray: string[] = [];
  if (typeof platforms === 'string') {
    platformArray = platforms.split(',').map(p => p.trim().toLowerCase());
  } else if (Array.isArray(platforms)) {
    platformArray = platforms.map(p => String(p).toLowerCase());
  }
  const hasIndustries = mappedAnswers.industries && mappedAnswers.industries.length > 0;
  const hasRoles = mappedAnswers.roles && mappedAnswers.roles.length > 0;
  const hasLocation = mappedAnswers.location;
  logger.debug('Platforms and targeting criteria', { platforms, platformArray, hasIndustries, hasRoles, hasLocation });
  // Step 1: Lead Generation (if targeting criteria provided)
  if (hasIndustries || hasRoles || hasLocation) {
    const leadGenerationFilters = buildLeadGenerationFilters(mappedAnswers);
    const targetDesc = [
      hasRoles ? `Roles: ${mappedAnswers.roles.join(', ')}` : '',
      hasIndustries ? `Industries: ${mappedAnswers.industries.join(', ')}` : '',
      hasLocation ? `Location: ${mappedAnswers.location}` : '',
    ].filter(Boolean).join(' | ');
    steps.push({
      type: 'lead_generation',
      order: order++,
      title: 'Generate Leads',
      description: targetDesc,
      config: {
        leadGenerationFilters: JSON.stringify(leadGenerationFilters),
        leadGenerationLimit: mappedAnswers.leads_per_day || 10,
      },
    });
  }
  // Process platforms in the order they were selected
  for (const platform of platformArray) {
    if (platform === 'linkedin') {
    const rawActions = mappedAnswers.linkedinActions || mappedAnswers.linkedin_actions || [];
    // Handle both array and string formats
    const linkedinActions = Array.isArray(rawActions)
      ? rawActions
      : (typeof rawActions === 'string' ? rawActions.split(',').map(s => s.trim()) : []);
    const delayConfig = mappedAnswers.workflow_delays || mappedAnswers.delays;
    // Check if user actually wants delays (not "No delay" or empty)
    const hasDelay = delayConfig && 
                    delayConfig !== 'No delay' && 
                    delayConfig !== 'no delay' &&
                    delayConfig !== 'No delay (actions run immediately)' &&
                    delayConfig !== 'Skip' &&
                    delayConfig !== 'skip' &&
                    delayConfig !== '' &&
                    delayConfig !== null &&
                    delayConfig !== undefined &&
                    !String(delayConfig).toLowerCase().includes('no delay') &&
                    !String(delayConfig).toLowerCase().includes('skip');
    logger.debug('LinkedIn actions', { rawActions, linkedinActions, isArray: Array.isArray(rawActions) });
    logger.debug('Delay config', { delayConfig, hasDelay });
    // Always add visit profile first when LinkedIn is selected
    steps.push({
      type: 'linkedin_visit',
      order: order++,
      title: 'Visit LinkedIn Profile',
      description: 'View target profile',
      config: {},
    });
    // Add delay after visit if configured
    if (hasDelay) {
      const delayStep = parseDelayConfig(delayConfig);
      if (delayStep) {
        steps.push(delayStep);
      }
    }
    // Check for follow actions
    const hasFollowAction = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('follow') || actionStr === 'follow';
    });
    if (hasFollowAction) {
      steps.push({
        type: 'linkedin_follow',
        order: order++,
        title: 'Follow LinkedIn Profile',
        description: 'Follow the profile',
        config: {},
      });
      // Add delay after follow if configured
      if (hasDelay) {
        const delayStep = parseDelayConfig(delayConfig);
        if (delayStep) {
          steps.push({ ...delayStep, order: order++ });
        }
      }
    }
    // Check for connection actions (handle various formats)
    const hasConnectionAction = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('connection') || 
             actionStr.includes('connect') ||
             actionStr === 'send_connection';
    });
    if (hasConnectionAction) {
      steps.push({
        type: 'linkedin_connect',
        order: order++,
        title: 'Send Connection Request',
        description: mappedAnswers.linkedinConnectionMessage || mappedAnswers.linkedin_connection_message || 'Connect with personalized message',
        config: {
          message: mappedAnswers.linkedinConnectionMessage || mappedAnswers.linkedin_connection_message,
        },
      });
      // Add delay after connection if configured
      if (hasDelay) {
        const delayStep = parseDelayConfig(delayConfig);
        if (delayStep) {
          steps.push({ ...delayStep, order: order++ });
        }
      }
    }
    // Check for message actions (handle various formats)
    const hasMessageAction = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('message') || 
             actionStr.includes('send message') ||
             actionStr === 'send_message_after_accepted';
    });
    if (hasMessageAction) {
      const messageTemplate = mappedAnswers.linkedinMessage || 
                            mappedAnswers.linkedin_message || 
                            mappedAnswers.linkedinTemplate || 
                            mappedAnswers.linkedin_template;
      steps.push({
        type: 'linkedin_message',
        order: order++,
        title: 'Send LinkedIn Message',
        description: messageTemplate || 'Send personalized message after connection',
        config: {
          message: messageTemplate,
        },
      });
    }
    } else if (platform === 'whatsapp') {
    const rawWhatsappActions = mappedAnswers.whatsappActions || mappedAnswers.whatsapp_actions || [];
    const whatsappActions = Array.isArray(rawWhatsappActions)
      ? rawWhatsappActions
      : (typeof rawWhatsappActions === 'string' ? rawWhatsappActions.split(',').map(s => s.trim()) : []);
    logger.debug('WhatsApp actions', { rawWhatsappActions, whatsappActions, isArray: Array.isArray(rawWhatsappActions) });
    // Check for broadcast action
    const hasBroadcast = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('broadcast');
    });
    if (hasBroadcast) {
      steps.push({
        type: 'whatsapp_broadcast',
        order: order++,
        title: 'Send WhatsApp Broadcast',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send broadcast message',
        config: {
          template: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template,
        },
      });
    }
    // Check for 1:1 message action
    const hasOneToOneMessage = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('1:1') || actionStr.includes('message');
    });
    if (hasOneToOneMessage) {
      steps.push({
        type: 'whatsapp_message',
        order: order++,
        title: 'Send WhatsApp 1:1 Message',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send direct message',
        config: {
          template: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template,
        },
      });
    }
    // Check for follow-up action
    const hasFollowUp = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('follow');
    });
    if (hasFollowUp) {
      steps.push({
        type: 'whatsapp_followup',
        order: order++,
        title: 'WhatsApp Follow-up',
        description: 'Send follow-up message',
        config: {
          template: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template,
        },
      });
    }
    // Check for template message
    const hasTemplate = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('template');
    });
    if (hasTemplate) {
      steps.push({
        type: 'whatsapp_template',
        order: order++,
        title: 'Send WhatsApp Template',
        description: 'Send template message',
        config: {
          template: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template,
        },
      });
    }
    } else if (platform === 'email') {
    const rawEmailActions = mappedAnswers.emailActions || mappedAnswers.email_actions || [];
    const emailActions = Array.isArray(rawEmailActions)
      ? rawEmailActions
      : (typeof rawEmailActions === 'string' ? rawEmailActions.split(',').map(s => s.trim()) : []);
    logger.debug('Email actions', { rawEmailActions, emailActions, isArray: Array.isArray(rawEmailActions) });
    const hasSendEmail = emailActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('send') && actionStr.includes('email');
    });
    if (hasSendEmail) {
      steps.push({
        type: 'email_send',
        order: order++,
        title: 'Send Email',
        description: 'Send personalized email',
        config: {},
      });
    }
    const hasFollowUpEmail = emailActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('follow');
    });
    if (hasFollowUpEmail) {
      steps.push({
        type: 'email_followup',
        order: order++,
        title: 'Send Follow-up Email',
        description: 'Follow up if no response',
        config: {},
      });
    }
    } else if (platform === 'voice' || platform.includes('voice')) {
    const rawVoiceActions = mappedAnswers.voiceActions || mappedAnswers.voice_actions || [];
    const voiceActions = Array.isArray(rawVoiceActions)
      ? rawVoiceActions
      : (typeof rawVoiceActions === 'string' ? rawVoiceActions.split(',').map(s => s.trim()) : []);
    logger.debug('Voice actions', { rawVoiceActions, voiceActions, isArray: Array.isArray(rawVoiceActions) });
    const hasTriggerCall = voiceActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('trigger') || actionStr.includes('call');
    });
    if (hasTriggerCall || voiceActions.length > 0) {
      steps.push({
        type: 'voice_call',
        order: order++,
        title: 'Trigger Voice Call',
        description: 'Initiate automated voice call',
        config: {},
      });
    }
    const hasCallScript = voiceActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('script');
    });
    if (hasCallScript) {
      steps.push({
        type: 'voice_script',
        order: order++,
        title: 'Use Call Script',
        description: 'Follow predefined call script',
        config: {},
      });
    }
    }
  }
  // Add workflow conditions if specified (after all platform steps)
  const conditionsConfig = mappedAnswers.workflow_conditions || mappedAnswers.conditions;
  if (conditionsConfig && conditionsConfig !== 'No conditions' && conditionsConfig !== 'no conditions') {
    steps.push({
      type: 'condition',
      order: order++,
      title: 'Check Condition',
      description: conditionsConfig,
      config: {
        condition: conditionsConfig,
      },
    });
  }
  logger.debug('Generated campaign steps with configs', { stepCount: steps.length });
  return steps;
}
/**
 * Parse delay configuration into a delay step
 */
function parseDelayConfig(delayConfig: any): { type: string; order: number; title: string; description: string; config: Record<string, any> } | null {
  let delayDays = 0;
  let delayHours = 0; 
  let delayMinutes = 0;
  let delayDescription = 'Wait period between actions';
  if (typeof delayConfig === 'object') {
    if (delayConfig.days) delayDays = parseInt(delayConfig.days) || 0;
    if (delayConfig.hours) delayHours = parseInt(delayConfig.hours) || 0;
    if (delayConfig.minutes) delayMinutes = parseInt(delayConfig.minutes) || 0;
    if (delayConfig.value) {
      // Parse value like "1 hour", "2 days", etc.
      const match = String(delayConfig.value).match(/(\d+)\s*(hour|day|minute)s?/i);
      if (match) {
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit.startsWith('hour')) delayHours = num;
        else if (unit.startsWith('day')) delayDays = num;
        else if (unit.startsWith('minute')) delayMinutes = num;
      }
    }
    delayDescription = `Wait: ${delayDays ? delayDays + ' days ' : ''}${delayHours ? delayHours + ' hours ' : ''}${delayMinutes ? delayMinutes + ' minutes' : ''}`.trim();
  } else if (typeof delayConfig === 'string') {
    // Parse delay string like "1 hour", "2 days", "30 minutes"
    const match = delayConfig.match(/(\d+)\s*(hour|day|minute)s?/i);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('hour')) delayHours = num;
      else if (unit.startsWith('day')) delayDays = num; 
      else if (unit.startsWith('minute')) delayMinutes = num;
      delayDescription = `Wait: ${delayConfig}`;
    } else {
      // Default to 1 hour if can't parse
      delayHours = 1;
      delayDescription = 'Wait: 1 hour (default)';
    }
  } else {
    // Default delay if no specific config
    delayHours = 1;
    delayDescription = 'Wait: 1 hour (default)';
  }
  // Only return delay step if at least one time unit is > 0
  if (delayDays > 0 || delayHours > 0 || delayMinutes > 0) {
    return {
      type: 'delay',
      order: 0, // Will be set by caller
      title: 'Wait Period',
      description: delayDescription,
      config: {
        delayDays: delayDays,
        delayHours: delayHours,
        delayMinutes: delayMinutes,
      },
    };
  }
  return null;
}