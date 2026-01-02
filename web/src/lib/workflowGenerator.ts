import { WorkflowPreviewStep } from '@/store/onboardingStore';
import { StepType } from '@/types/campaign';

/**
 * Build lead generation filters from mapped answers
 * Maps ICP answers to Apollo API parameter names
 */
function buildLeadGenerationFilters(mappedAnswers: Record<string, any>): Record<string, any> {
  const filters: Record<string, any> = {};

  // Map roles to person_titles (Apollo API expects person_titles)
  if (mappedAnswers.roles && mappedAnswers.roles.length > 0) {
    filters.person_titles = mappedAnswers.roles;
  }

  // Map industries to organization_industries (Apollo API expects organization_industries)
  if (mappedAnswers.industries && mappedAnswers.industries.length > 0) {
    const validIndustries = mappedAnswers.industries.filter((industry: string) => {
      const trimmed = String(industry).trim();
      return trimmed.length >= 2 && !trimmed.match(/^[a-z]$/i);
    });
    if (validIndustries.length > 0) {
      filters.organization_industries = validIndustries;
    }
  }

  // Map location to organization_locations (Apollo API expects organization_locations as array)
  if (mappedAnswers.location) {
    filters.organization_locations = Array.isArray(mappedAnswers.location)
      ? mappedAnswers.location
      : [mappedAnswers.location];
  }

  return filters;
}

/**
 * Generate progressive workflow preview based on current ICP answers (during onboarding)
 * This updates the workflow preview as the user answers each question
 */
export function generateProgressiveWorkflowPreview(
  icpAnswers: Record<string, any>, 
  currentStepIndex: number = 0
): WorkflowPreviewStep[] {
  console.log('[WorkflowGenerator] Generating progressive workflow from ICP answers:', icpAnswers, 'stepIndex:', currentStepIndex);
  
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
  
  console.log('[WorkflowGenerator] Targeting check:', { 
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
  
  console.log('[WorkflowGenerator] Platforms found:', platforms, 'converted to array:', platformArray);
  
  // LinkedIn steps (show after LinkedIn is selected)
  if (platformArray.includes('linkedin')) {
    console.log('[WorkflowGenerator] Adding LinkedIn steps for platform:', platforms);
    
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

  console.log('[WorkflowGenerator] Progressive workflow generated:', steps.length, 'steps for stepIndex:', currentStepIndex);
  return steps;
}

/**
 * Generate workflow preview steps from mapped ICP answers
 * This creates a visual representation of the campaign workflow for the WorkflowPreviewPanel
 */
export function generateWorkflowPreview(mappedAnswers: Record<string, any>): WorkflowPreviewStep[] {
  console.log('[WorkflowGenerator] Generating workflow preview from answers:', mappedAnswers);
  
  const steps: WorkflowPreviewStep[] = [];
  let stepId = 1;

  // Extract platforms and actions
  const platforms = mappedAnswers.platforms || [];
  const hasIndustries = mappedAnswers.industries && mappedAnswers.industries.length > 0;
  const hasRoles = mappedAnswers.roles && mappedAnswers.roles.length > 0;
  const hasLocation = mappedAnswers.location;

  console.log('[WorkflowGenerator] Platforms:', platforms);
  console.log('[WorkflowGenerator] Has targeting criteria:', { hasIndustries, hasRoles, hasLocation });

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
    console.log('[WorkflowGenerator] LinkedIn actions:', linkedinActions);
    
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
    console.log('[WorkflowGenerator] WhatsApp actions:', whatsappActions);
    
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
    console.log('[WorkflowGenerator] Email actions:', emailActions);
    
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
    console.log('[WorkflowGenerator] Voice actions:', voiceActions);
    
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

  console.log('[WorkflowGenerator] Generated', steps.length, 'workflow steps');
  return steps;
}
/**
 * Generate full campaign steps from mapped ICP answers
 * This includes complete step configs with all required properties for backend processing
 * Used when creating campaigns programmatically (e.g., from chat ICP onboarding)
 */
export function generateCampaignSteps(mappedAnswers: Record<string, any>): Array<{ type: string; order: number; title: string; description: string; config: Record<string, any> }> {
  console.log('[WorkflowGenerator] Generating campaign steps from answers:', mappedAnswers);

  const steps: Array<{ type: string; order: number; title: string; description: string; config: Record<string, any> }> = [];
  let order = 0;

  // Extract platforms and actions
  const platforms = mappedAnswers.platforms || [];
  const hasIndustries = mappedAnswers.industries && mappedAnswers.industries.length > 0;
  const hasRoles = mappedAnswers.roles && mappedAnswers.roles.length > 0;
  const hasLocation = mappedAnswers.location;

  console.log('[WorkflowGenerator] Platforms:', platforms);
  console.log('[WorkflowGenerator] Has targeting criteria:', { hasIndustries, hasRoles, hasLocation });

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

  // LinkedIn steps
  if (platforms.includes('linkedin')) {
    const linkedinActions = mappedAnswers.linkedinActions || mappedAnswers.linkedin_actions || [];
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
    
    console.log('[WorkflowGenerator] LinkedIn actions:', linkedinActions);
    console.log('[WorkflowGenerator] Delay config:', delayConfig, 'hasDelay:', hasDelay);

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
      
      // Only add delay if at least one time unit is > 0
      if (delayDays > 0 || delayHours > 0 || delayMinutes > 0) {
        steps.push({
          type: 'delay',
          order: order++,
          title: 'Wait Period',
          description: delayDescription,
          config: {
            delayDays: delayDays,
            delayHours: delayHours,
            delayMinutes: delayMinutes,
          },
        });
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
        let delayDays = 0;
        let delayHours = 0; 
        let delayMinutes = 0;
        
        if (typeof delayConfig === 'string') {
          const match = delayConfig.match(/(\d+)\s*(hour|day|minute)s?/i);
          if (match) {
            const num = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.startsWith('hour')) delayHours = num;
            else if (unit.startsWith('day')) delayDays = num;
            else if (unit.startsWith('minute')) delayMinutes = num;
          } else {
            delayHours = 1; // default
          }
        } else {
          delayHours = 1; // default
        }
        
        if (delayDays > 0 || delayHours > 0 || delayMinutes > 0) {
          steps.push({
            type: 'delay',
            order: order++,
            title: 'Wait Period',
            description: 'Wait before next action',
            config: {
              delayDays: delayDays,
              delayHours: delayHours,
              delayMinutes: delayMinutes,
            },
          });
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
        let delayDays = 0;
        let delayHours = 0; 
        let delayMinutes = 0;
        
        if (typeof delayConfig === 'string') {
          const match = delayConfig.match(/(\d+)\s*(hour|day|minute)s?/i);
          if (match) {
            const num = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.startsWith('hour')) delayHours = num;
            else if (unit.startsWith('day')) delayDays = num;
            else if (unit.startsWith('minute')) delayMinutes = num;
          } else {
            delayHours = 1; // default
          }
        } else {
          delayHours = 1; // default
        }
        
        if (delayDays > 0 || delayHours > 0 || delayMinutes > 0) {
          steps.push({
            type: 'delay',
            order: order++,
            title: 'Wait Period',
            description: 'Wait before next action',
            config: {
              delayDays: delayDays,
              delayHours: delayHours,
              delayMinutes: delayMinutes,
            },
          });
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
  }

  // WhatsApp steps
  if (platforms.includes('whatsapp')) {
    const whatsappActions = mappedAnswers.whatsappActions || mappedAnswers.whatsapp_actions || [];
    console.log('[WorkflowGenerator] WhatsApp actions:', whatsappActions);

    if (whatsappActions.includes('send_broadcast')) {
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

    if (whatsappActions.includes('send_1to1')) {
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
  }

  // Email steps
  if (platforms.includes('email')) {
    const emailActions = mappedAnswers.emailActions || mappedAnswers.email_actions || [];
    console.log('[WorkflowGenerator] Email actions:', emailActions);

    if (emailActions.includes('send_email')) {
      steps.push({
        type: 'email_send',
        order: order++,
        title: 'Send Email',
        description: 'Send personalized email',
        config: {},
      });
    }

    if (emailActions.includes('followup_email')) {
      steps.push({
        type: 'email_followup',
        order: order++,
        title: 'Send Follow-up Email',
        description: 'Follow up if no response',
        config: {},
      });
    }
  }

  // Voice steps
  if (platforms.includes('voice')) {
    const voiceActions = mappedAnswers.voiceActions || mappedAnswers.voice_actions || [];
    console.log('[WorkflowGenerator] Voice actions:', voiceActions);

    if (voiceActions.includes('call')) {
      steps.push({
        type: 'voice_call',
        order: order++,
        title: 'Make Voice Call',
        description: 'Call lead using AI voice agent',
        config: {},
      });
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

  console.log('[WorkflowGenerator] Generated', steps.length, 'campaign steps with configs');
  return steps;
}