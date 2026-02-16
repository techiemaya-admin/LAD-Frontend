/**
 * Workflow Preview Generator
 * 
 * Generates workflow preview steps for UI display
 */
import { WorkflowPreviewStep } from '@/store/onboardingStore';
import { logger } from '@/lib/logger';
/**
 * Generate progressive workflow preview based on current ICP answers (during onboarding)
 * This updates the workflow preview as the user answers each question
 */
export function generateProgressiveWorkflowPreview(
  icpAnswers: Record<string, any>, 
  currentStepIndex: number = 0
): WorkflowPreviewStep[] {
  logger.debug('Generating progressive workflow from ICP answers', { icpAnswers, stepIndex: currentStepIndex });
  const steps: WorkflowPreviewStep[] = [];
  let stepId = 1;
  // Progressive logic: Show steps based on what's been answered
  // Step 1: Lead Generation (show after ANY targeting info is provided)
  // Backend uses keys: icp_industries, icp_roles, icp_location, icp_platforms
  const hasIndustries = (icpAnswers.icp_industries && String(icpAnswers.icp_industries).trim() !== '') || 
                       (icpAnswers.industries && (Array.isArray(icpAnswers.industries) ? icpAnswers.industries.length > 0 : icpAnswers.industries.trim() !== ''));
  const hasRoles = (icpAnswers.icp_roles && String(icpAnswers.icp_roles).trim() !== '') || 
                   (icpAnswers.roles && (Array.isArray(icpAnswers.roles) ? icpAnswers.roles.length > 0 : icpAnswers.roles.trim() !== ''));
  const hasLocation = (icpAnswers.icp_location && String(icpAnswers.icp_location).trim() !== '') || 
                     (icpAnswers.icp_locations && String(icpAnswers.icp_locations).trim() !== '') ||
                     (icpAnswers.location && (Array.isArray(icpAnswers.location) ? icpAnswers.location.length > 0 : icpAnswers.location.trim() !== ''));
  const hasTargeting = hasIndustries || hasRoles || hasLocation;
  logger.debug('Targeting check', { 
    icpAnswers, 
    icp_industries: icpAnswers.icp_industries,
    icp_roles: icpAnswers.icp_roles,
    icp_location: icpAnswers.icp_location,
    hasIndustries, 
    hasRoles, 
    hasLocation, 
    hasTargeting 
  });
  if (hasTargeting) {
    const targetParts = [];
    // Add roles (check both backend icp_roles and frontend roles)
    if (icpAnswers.icp_roles) {
      targetParts.push(`Roles: ${icpAnswers.icp_roles}`);
    } else if (hasRoles) {
      const roles = Array.isArray(icpAnswers.roles) ? icpAnswers.roles.join(', ') : icpAnswers.roles;
      targetParts.push(`Roles: ${roles}`);
    }
    // Add industries (check both backend icp_industries and frontend industries)
    if (icpAnswers.icp_industries) {
      targetParts.push(`Industries: ${icpAnswers.icp_industries}`);
    } else if (hasIndustries) {
      const industries = Array.isArray(icpAnswers.industries) ? icpAnswers.industries.join(', ') : icpAnswers.industries;
      targetParts.push(`Industries: ${industries}`);
    }
    // Add location (check both backend icp_location/icp_locations and frontend location)
    if (icpAnswers.icp_location) {
      targetParts.push(`Location: ${icpAnswers.icp_location}`);
    } else if (icpAnswers.icp_locations) {
      targetParts.push(`Location: ${icpAnswers.icp_locations}`);
    } else if (hasLocation) {
      const location = Array.isArray(icpAnswers.location) ? icpAnswers.location.join(', ') : icpAnswers.location;
      targetParts.push(`Location: ${location}`);
    }
    const targetDesc = targetParts.length > 0 ? targetParts.join(' | ') : 'Lead generation configured';
    // Get leads per day from icpAnswers (only if explicitly set)
    const leadsPerDay = icpAnswers.leads_per_day || icpAnswers.dailyLeadVolume;
    const leadGenStep: WorkflowPreviewStep = {
      id: `step_${stepId++}`,
      type: 'lead_generation',
      title: 'Generate Leads',
      description: targetDesc,
      channel: undefined,
    };
    // Only add leadLimit if it was explicitly provided
    if (leadsPerDay) {
      leadGenStep.leadLimit = leadsPerDay;
    }
    steps.push(leadGenStep);
  }
  // Platform steps: Check for platform selection (backend uses icp_platforms)
  const platforms = icpAnswers.icp_platforms || icpAnswers.platforms || icpAnswers.selected_platforms || [];
  // Convert single string to array if needed
  let platformArray: string[] = [];
  if (typeof platforms === 'string') {
    // Handle comma-separated string like "LinkedIn" or "LinkedIn, Email"
    platformArray = platforms.split(',').map(p => p.trim().toLowerCase());
  } else if (Array.isArray(platforms)) {
    platformArray = platforms.map(p => String(p).toLowerCase());
  }
  logger.debug('Platforms found', { platforms, platformArray });
  // Process platforms in the order they were selected
  let platformIndex = 0;
  for (const platform of platformArray) {
    // Check for delay BETWEEN this platform and the previous one
    if (platformIndex > 0) {
      const prevPlatform = platformArray[platformIndex - 1];
      // Check dynamic delay key format: delay_{prevPlatform}_{currentPlatform}
      const delayKey = `delay_${prevPlatform}_${platform}`;
      const delayValue = icpAnswers[delayKey] || 
                         icpAnswers.delay_between_platforms || 
                         icpAnswers.workflow_delays;
      if (delayValue && delayValue.toString().trim() !== '') {
        // Parse delay value - detect if it's hours or days
        const delayStr = delayValue.toString().toLowerCase();
        const delayNum = parseInt(delayStr) || 1;
        const isHours = delayStr.includes('hour');
        const isDays = delayStr.includes('day');
        steps.push({
          id: `step_${stepId++}`,
          type: 'delay',
          title: `Wait ${delayValue}`,
          description: `Delay before ${platform.charAt(0).toUpperCase() + platform.slice(1)} outreach`,
          delayDays: isDays ? delayNum : 0,
          delayHours: isHours ? delayNum : 0,
        });
      }
    }
    if (platform === 'linkedin') {
      logger.debug('Adding LinkedIn steps for platform', { platforms });
      // Get LinkedIn actions - check multiple possible keys
      const rawActions = icpAnswers.linkedin_actions || icpAnswers.linkedinActions || [];
      // Handle both array and string formats
      const linkedinActions = Array.isArray(rawActions) 
        ? rawActions 
        : (typeof rawActions === 'string' ? rawActions.split(',').map(s => s.trim()) : []);
      logger.debug('LinkedIn actions from icpAnswers', { 
        rawActions, 
        rawActionsType: typeof rawActions,
        isArray: Array.isArray(rawActions),
        linkedinActions,
        linkedinActionsLength: linkedinActions.length
      });
      // Normalize actions for flexible matching
      const hasVisit = linkedinActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('visit') || actionStr === 'visit_profile';
      });
      // const hasFollow = linkedinActions.some((action: string) => {
      //   const actionStr = String(action).toLowerCase();
      //   return actionStr.includes('follow') && !actionStr.includes('message');
      // });
      const hasConnect = linkedinActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('connection') || actionStr.includes('connect') || actionStr === 'send_connection';
      });
      const hasMessage = linkedinActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('message');
      });
      // Add visit step
      if (hasVisit || linkedinActions.length > 0) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'linkedin_visit',
          title: 'Visit LinkedIn Profile',
          description: 'View target profile',
          channel: 'linkedin',
        });
      }
      // Add follow step
      // if (hasFollow) {
      //   steps.push({
      //     id: `step_${stepId++}`,
      //     type: 'linkedin_follow',
      //     title: 'Follow LinkedIn Profile',
      //     description: 'Follow the profile',
      //     channel: 'linkedin',
      //   });
      // }
      // Add connection step
      if (hasConnect) {
        const connectionMessage = icpAnswers.linkedin_connection_template ||
          icpAnswers.linkedin_connection_message ||
          icpAnswers.linkedin_template ||
          null;
        steps.push({
          id: `step_${stepId++}`,
          type: 'linkedin_connect',
          title: 'Send Connection Request',
          description: connectionMessage || 'Connect with personalized message',
          channel: 'linkedin',
        });
      }
      // Add message step
      if (hasMessage) {
        const followupMessage = icpAnswers.linkedin_followup_template ||
          icpAnswers.linkedin_message_template ||
          icpAnswers.linkedinMessage ||
          icpAnswers.linkedin_message ||
          icpAnswers.linkedin_template ||
          'Send personalized message';
        steps.push({
          id: `step_${stepId++}`,
          type: 'linkedin_message',
          title: 'Send LinkedIn Message',
          description: followupMessage,
          channel: 'linkedin',
        });
      }
    } else if (platform === 'whatsapp') {
      const rawWhatsappActions = icpAnswers.whatsapp_actions || icpAnswers.whatsappActions || [];
      const whatsappActions = Array.isArray(rawWhatsappActions)
        ? rawWhatsappActions
        : (typeof rawWhatsappActions === 'string' ? rawWhatsappActions.split(',').map(s => s.trim()) : []);
      logger.debug('WhatsApp actions from icpAnswers', { 
        rawWhatsappActions, 
        rawActionsType: typeof rawWhatsappActions,
        isArray: Array.isArray(rawWhatsappActions),
        whatsappActions,
        whatsappActionsLength: whatsappActions.length
      });
      // Check for broadcast action
      const hasBroadcast = whatsappActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('broadcast');
      });
      if (hasBroadcast) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'whatsapp_broadcast',
          title: 'Send WhatsApp Broadcast',
          description: icpAnswers.whatsapp_template || 'Send broadcast message',
          channel: 'whatsapp',
        });
      }
      // Check for 1:1 message
      const hasOneToOne = whatsappActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('1:1') || (actionStr.includes('message') && !actionStr.includes('broadcast'));
      });
      if (hasOneToOne) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'whatsapp_message',
          title: 'Send WhatsApp 1:1 Message',
          description: icpAnswers.whatsapp_template || 'Send direct message',
          channel: 'whatsapp',
        });
      }
      // Check for follow-up
      const hasFollowUp = whatsappActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('follow');
      });
      if (hasFollowUp) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'whatsapp_followup',
          title: 'WhatsApp Follow-up',
          description: 'Send follow-up message',
          channel: 'whatsapp',
        });
      }
      // Check for template message
      const hasTemplate = whatsappActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('template');
      });
      if (hasTemplate) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'whatsapp_template',
          title: 'Send WhatsApp Template',
          description: 'Send template message',
          channel: 'whatsapp',
        });
      }
      // Fallback: if no specific actions matched but whatsapp is selected
      if (!hasBroadcast && !hasOneToOne && !hasFollowUp && !hasTemplate && whatsappActions.length > 0) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'whatsapp_message',
          title: 'Send WhatsApp Message',
          description: icpAnswers.whatsapp_template || 'Send WhatsApp message',
          channel: 'whatsapp',
        });
      }
    } else if (platform === 'email') {
      const rawEmailActions = icpAnswers.email_actions || icpAnswers.emailActions || [];
      const emailActions = Array.isArray(rawEmailActions)
        ? rawEmailActions
        : (typeof rawEmailActions === 'string' ? rawEmailActions.split(',').map(s => s.trim()) : []);
      const hasSendEmail = emailActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('send') && actionStr.includes('email');
      });
      if (hasSendEmail || emailActions.length > 0) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'email_send',
          title: 'Send Email',
          description: 'Send email campaign',
          channel: 'email',
        });
      }
      const hasFollowUpEmail = emailActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('follow');
      });
      if (hasFollowUpEmail) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'email_followup',
          title: 'Send Follow-up Email',
          description: 'Follow up if no response',
          channel: 'email',
        });
      }
    } else if (platform === 'voice' || platform.includes('voice')) {
      const rawVoiceActions = icpAnswers.voice_actions || icpAnswers.voiceActions || [];
      const voiceActions = Array.isArray(rawVoiceActions)
        ? rawVoiceActions
        : (typeof rawVoiceActions === 'string' ? rawVoiceActions.split(',').map(s => s.trim()) : []);
      logger.debug('Voice actions from icpAnswers', { 
        rawVoiceActions, 
        rawActionsType: typeof rawVoiceActions,
        isArray: Array.isArray(rawVoiceActions),
        voiceActions,
        voiceActionsLength: voiceActions.length
      });
      const hasTriggerCall = voiceActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('trigger') || actionStr.includes('call');
      });
      if (hasTriggerCall || voiceActions.length > 0) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'voice_call',
          title: 'Trigger Voice Call',
          description: 'Initiate automated voice call',
          channel: 'voice',
        });
      }
      const hasCallScript = voiceActions.some((action: string) => {
        const actionStr = String(action).toLowerCase();
        return actionStr.includes('script');
      });
      if (hasCallScript) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'voice_script',
          title: 'Use Call Script',
          description: 'Follow predefined call script',
          channel: 'voice',
        });
      }
    }
    // Increment platform index for delay logic
    platformIndex++;
  }
  logger.debug('Progressive workflow generated', { stepCount: steps.length, stepIndex: currentStepIndex });
  return steps;
}
/**
 * Generate workflow preview steps from mapped ICP answers
 * This creates a visual representation of the campaign workflow for the WorkflowPreviewPanel
 */
export function generateWorkflowPreview(mappedAnswers: Record<string, any>): WorkflowPreviewStep[] {
  logger.debug('Generating workflow preview from answers', { mappedAnswers });
  const steps: WorkflowPreviewStep[] = [];
  let stepId = 1;
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
    const targetDesc = [
      hasRoles ? `Roles: ${mappedAnswers.roles.join(', ')}` : '',
      hasIndustries ? `Industries: ${mappedAnswers.industries.join(', ')}` : '',
      hasLocation ? `Location: ${mappedAnswers.location}` : '',
    ].filter(Boolean).join(' | ');
    // Get leads per day from mappedAnswers (only if explicitly set)
    const leadsPerDay = mappedAnswers.leads_per_day;
    const leadGenStep: WorkflowPreviewStep = {
      id: `step_${stepId++}`,
      type: 'lead_generation',
      title: 'Generate Leads',
      description: targetDesc,
      channel: undefined,
    };
    // Only add leadLimit if it was explicitly provided
    if (leadsPerDay) {
      leadGenStep.leadLimit = leadsPerDay;
    }
    steps.push(leadGenStep);
  }
  // Process platforms in the order they were selected
  for (const platform of platformArray) {
    if (platform === 'linkedin') {
    // Handle both camelCase and snake_case
    const rawActions = mappedAnswers.linkedinActions || mappedAnswers.linkedin_actions || [];
    // Handle both array and string formats
    const linkedinActions = Array.isArray(rawActions)
      ? rawActions
      : (typeof rawActions === 'string' ? rawActions.split(',').map(s => s.trim()) : []);
    logger.debug('LinkedIn actions', { 
      rawActions, 
      rawActionsType: typeof rawActions,
      isArray: Array.isArray(rawActions),
      linkedinActions,
      linkedinActionsLength: linkedinActions.length
    });
    // Normalize actions for flexible matching
    const hasVisit = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('visit') || actionStr === 'visit_profile';
    });
    const hasFollow = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('follow') && !actionStr.includes('message');
    });
    const hasConnect = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('connection') || actionStr.includes('connect') || actionStr === 'send_connection';
    });
    const hasMessage = linkedinActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('message');
    });
    // Visit profile
    if (hasVisit || linkedinActions.length > 0) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_visit',
        title: 'Visit LinkedIn Profile',
        description: 'View target profile',
        channel: 'linkedin',
      });
    }
    // Follow profile
    if (hasFollow) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_follow',
        title: 'Follow LinkedIn Profile',
        description: 'Follow the profile',
        channel: 'linkedin',
      });
    }
    // Send connection request
    if (hasConnect) {
      // Get connection message from any available source (linkedin_template is from ICP flow)
      const connectionMessage = mappedAnswers.linkedinConnectionMessage || 
                                mappedAnswers.linkedin_connection_message || 
                                mappedAnswers.linkedin_connection_template ||
                                mappedAnswers.linkedin_template || 
                                null;
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_connect',
        title: 'Send Connection Request',
        description: connectionMessage || 'Connect with personalized message',
        channel: 'linkedin',
      });
    }
    // Send message (after connection accepted)
    if (hasMessage) {
      const followupMessage = mappedAnswers.linkedin_followup_template ||
                              mappedAnswers.linkedinMessage ||
                              mappedAnswers.linkedin_message ||
                              'Send personalized message';
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_message',
        title: 'Send LinkedIn Message',
        description: followupMessage,
        channel: 'linkedin',
      });
    }
    } else if (platform === 'whatsapp') {
    const rawWhatsappActions = mappedAnswers.whatsappActions || mappedAnswers.whatsapp_actions || [];
    const whatsappActions = Array.isArray(rawWhatsappActions)
      ? rawWhatsappActions
      : (typeof rawWhatsappActions === 'string' ? rawWhatsappActions.split(',').map(s => s.trim()) : []);
    logger.debug('WhatsApp actions', { 
      rawWhatsappActions, 
      rawActionsType: typeof rawWhatsappActions,
      isArray: Array.isArray(rawWhatsappActions),
      whatsappActions,
      whatsappActionsLength: whatsappActions.length
    });
    // Check for broadcast action
    const hasBroadcast = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('broadcast');
    });
    if (hasBroadcast) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_broadcast',
        title: 'Send WhatsApp Broadcast',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send broadcast message',
        channel: 'whatsapp',
      });
    }
    // Check for 1:1 message
    const hasOneToOne = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('1:1') || (actionStr.includes('message') && !actionStr.includes('broadcast'));
    });
    if (hasOneToOne) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_message',
        title: 'Send WhatsApp 1:1 Message',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send direct message',
        channel: 'whatsapp',
      });
    }
    // Check for follow-up
    const hasFollowUp = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('follow');
    });
    if (hasFollowUp) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_followup',
        title: 'WhatsApp Follow-up',
        description: 'Send follow-up message',
        channel: 'whatsapp',
      });
    }
    // Check for template message
    const hasTemplate = whatsappActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('template');
    });
    if (hasTemplate) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_template',
        title: 'Send WhatsApp Template',
        description: 'Send template message',
        channel: 'whatsapp',
      });
    }
    // Fallback: if no specific actions matched but whatsapp is selected
    if (!hasBroadcast && !hasOneToOne && !hasFollowUp && !hasTemplate && whatsappActions.length > 0) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_message',
        title: 'Send WhatsApp Message',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send WhatsApp message',
        channel: 'whatsapp',
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
    if (hasSendEmail || emailActions.length > 0) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'email_send',
        title: 'Send Email',
        description: 'Send personalized email',
        channel: 'email',
      });
    }
    const hasFollowUpEmail = emailActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('follow');
    });
    if (hasFollowUpEmail) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'email_followup',
        title: 'Send Follow-up Email',
        description: 'Follow up if no response',
        channel: 'email',
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
        id: `step_${stepId++}`,
        type: 'voice_call',
        title: 'Trigger Voice Call',
        description: 'Initiate automated voice call',
        channel: 'voice',
      });
    }
    const hasCallScript = voiceActions.some((action: string) => {
      const actionStr = String(action).toLowerCase();
      return actionStr.includes('script');
    });
    if (hasCallScript) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'voice_script',
        title: 'Use Call Script',
        description: 'Follow predefined call script',
        channel: 'voice',
      });
    }
    }
  }
  // Add delay if specified
  if (mappedAnswers.delays && mappedAnswers.delays !== 'No delay') {
    steps.push({
      id: `step_${stepId++}`,
      type: 'delay',
      title: 'Wait Period',
      description: mappedAnswers.delays,
      channel: undefined,
    });
  }
  // Add conditions if specified
  if (mappedAnswers.conditions && mappedAnswers.conditions !== 'No conditions') {
    steps.push({
      id: `step_${stepId++}`,
      type: 'condition',
      title: 'Check Condition',
      description: mappedAnswers.conditions,
      channel: undefined,
    });
  }
  logger.debug('Generated workflow steps', { stepCount: steps.length });
  return steps;
}
