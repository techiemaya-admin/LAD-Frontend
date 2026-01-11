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
    
    // Add location (check both backend icp_location and frontend location)
    if (icpAnswers.icp_location) {
      targetParts.push(`Location: ${icpAnswers.icp_location}`);
    } else if (hasLocation) {
      const location = Array.isArray(icpAnswers.location) ? icpAnswers.location.join(', ') : icpAnswers.location;
      targetParts.push(`Location: ${location}`);
    }
    
    const targetDesc = targetParts.length > 0 ? targetParts.join(' | ') : 'Lead generation configured';

    steps.push({
      id: `step_${stepId++}`,
      type: 'lead_generation',
      title: 'Generate Leads',
      description: targetDesc,
      channel: undefined,
    });
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
  
  // LinkedIn steps (show after LinkedIn is selected)
  if (platformArray.includes('linkedin')) {
    logger.debug('Adding LinkedIn steps for platform', { platforms });
    
    // Always add visit step first when LinkedIn is selected
    steps.push({
      id: `step_${stepId++}`,
      type: 'linkedin_visit',
      title: 'Visit LinkedIn Profile',
      description: 'View target profile',
      channel: 'linkedin',
    });

    // Add connection step if actions are configured
    const linkedinActions = icpAnswers.linkedin_actions || [];
    if (Array.isArray(linkedinActions) && linkedinActions.length > 0) {
      if (linkedinActions.some((action: string) => 
        String(action).toLowerCase().includes('connection') || 
        String(action).toLowerCase().includes('connect')
      )) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'linkedin_connect',
          title: 'Send Connection Request',
          description: 'Connect with personalized message',
          channel: 'linkedin',
        });
      }

      // Add message step only if template is provided
      if (linkedinActions.some((action: string) => 
        String(action).toLowerCase().includes('message')
      ) && icpAnswers.linkedin_template) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'linkedin_message',
          title: 'Send LinkedIn Message',
          description: icpAnswers.linkedin_template,
          channel: 'linkedin',
        });
      }
    }
  }

  // Add other platform steps
  if (platformArray.includes('whatsapp')) {
    steps.push({
      id: `step_${stepId++}`,
      type: 'whatsapp_message',
      title: 'Send WhatsApp Message',
      description: 'Send WhatsApp message',
      channel: 'whatsapp',
    });
  }

  if (platformArray.includes('email')) {
    steps.push({
      id: `step_${stepId++}`,
      type: 'email_send',
      title: 'Send Email',
      description: 'Send email campaign',
      channel: 'email',
    });
  }

  if (platformArray.includes('voice')) {
    steps.push({
      id: `step_${stepId++}`,
      type: 'voice_call',
      title: 'Voice Call',
      description: 'Trigger voice call',
      channel: 'voice',
    });
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
  const hasIndustries = mappedAnswers.industries && mappedAnswers.industries.length > 0;
  const hasRoles = mappedAnswers.roles && mappedAnswers.roles.length > 0;
  const hasLocation = mappedAnswers.location;

  logger.debug('Platforms and targeting criteria', { platforms, hasIndustries, hasRoles, hasLocation });

  // Step 1: Lead Generation (if targeting criteria provided)
  if (hasIndustries || hasRoles || hasLocation) {
    const targetDesc = [
      hasRoles ? `Roles: ${mappedAnswers.roles.join(', ')}` : '',
      hasIndustries ? `Industries: ${mappedAnswers.industries.join(', ')}` : '',
      hasLocation ? `Location: ${mappedAnswers.location}` : '',
    ].filter(Boolean).join(' | ');

    steps.push({
      id: `step_${stepId++}`,
      type: 'lead_generation',
      title: 'Generate Leads',
      description: targetDesc,
      channel: undefined,
    });
  }

  // LinkedIn steps
  if (platforms.includes('linkedin')) {
    // Handle both camelCase and snake_case
    const linkedinActions = mappedAnswers.linkedinActions || mappedAnswers.linkedin_actions || [];
    logger.debug('LinkedIn actions', { linkedinActions });
    
    // Visit profile
    if (linkedinActions.includes('visit_profile') || linkedinActions.length > 0) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_visit',
        title: 'Visit LinkedIn Profile',
        description: 'View target profile',
        channel: 'linkedin',
      });
    }

    // Send connection request
    if (linkedinActions.includes('send_connection')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_connect',
        title: 'Send Connection Request',
        description: mappedAnswers.linkedinConnectionMessage || mappedAnswers.linkedin_connection_message || 'Connect with personalized message',
        channel: 'linkedin',
      });
    }

    // Follow
    if (linkedinActions.includes('follow')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_follow',
        title: 'Follow LinkedIn Profile',
        description: 'Follow the profile',
        channel: 'linkedin',
      });
    }

    // Send message (after connection accepted)
    if (linkedinActions.includes('send_message_after_accepted')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_message',
        title: 'Send LinkedIn Message',
        description: mappedAnswers.linkedinMessage || mappedAnswers.linkedin_message || 'Send personalized message',
        channel: 'linkedin',
      });
    }
  }

  // WhatsApp steps
  if (platforms.includes('whatsapp')) {
    // Handle both camelCase and snake_case
    const whatsappActions = mappedAnswers.whatsappActions || mappedAnswers.whatsapp_actions || [];
    logger.debug('WhatsApp actions', { whatsappActions });
    
    if (whatsappActions.includes('send_broadcast')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_broadcast',
        title: 'Send WhatsApp Broadcast',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send broadcast message',
        channel: 'whatsapp',
      });
    }

    if (whatsappActions.includes('send_1to1')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_message',
        title: 'Send WhatsApp 1:1 Message',
        description: mappedAnswers.whatsappTemplate || mappedAnswers.whatsapp_template || 'Send direct message',
        channel: 'whatsapp',
      });
    }
  }

  // Email steps
  if (platforms.includes('email')) {
    // Handle both camelCase and snake_case
    const emailActions = mappedAnswers.emailActions || mappedAnswers.email_actions || [];
    logger.debug('Email actions', { emailActions });
    
    if (emailActions.includes('send_email')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'email_send',
        title: 'Send Email',
        description: 'Send personalized email',
        channel: 'email',
      });
    }

    if (emailActions.includes('followup_email')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'email_followup',
        title: 'Send Follow-up Email',
        description: 'Follow up if no response',
        channel: 'email',
      });
    }
  }

  // Voice steps
  if (platforms.includes('voice')) {
    // Handle both camelCase and snake_case
    const voiceActions = mappedAnswers.voiceActions || mappedAnswers.voice_actions || [];
    logger.debug('Voice actions', { voiceActions });
    
    if (voiceActions.includes('call')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'voice_call',
        title: 'Make Voice Call',
        description: 'Call lead using AI voice agent',
        channel: 'voice',
      });
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


