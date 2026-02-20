'use client';
import React from 'react';
import { CheckCircle2, Loader2, Pause, XCircle, Minus, Circle, Linkedin, Mail, MessageCircle, Phone, Instagram, Mic } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type StepState = 'COMPLETED' | 'IN_PROGRESS' | 'PAUSED' | 'FAILED' | 'SKIPPED' | 'PENDING' | 'WAITING';

interface StepConfig {
  id: string;
  label: string;
  state: StepState;
  tooltip?: string;
  helperText?: string;
}

interface LeadStepperRowProps {
  leadId: string;
  leadName: string;
  leadLinkedin?: string;
  platform?: string;
  profileVisited: boolean;
  connectionStatus: 'NOT_SENT' | 'SENT' | 'FAILED' | 'PAUSED';
  connectionSentWithMessage: boolean;
  connectionAccepted: boolean;
  contacted: boolean;
  contactedStatus?: 'SENT' | 'FAILED' | 'SKIPPED';
  leadReplied: boolean;
  pauseReason?: 'DAILY_LIMIT' | 'WEEKLY_LIMIT' | 'RATE_LIMIT';
  errorMessage?: string;
}

const getStepIcon = (state: StepState) => {
  switch (state) {
    case 'COMPLETED':
      return <CheckCircle2 className="w-6 h-6 text-green-600 transition-transform duration-200" />;
    case 'IN_PROGRESS':
      return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
    case 'PAUSED':
      return <Pause className="w-6 h-6 text-yellow-600 transition-transform duration-200" />;
    case 'FAILED':
      return <XCircle className="w-6 h-6 text-red-600 transition-transform duration-200" />;
    case 'SKIPPED':
      return <Minus className="w-6 h-6 text-gray-400 transition-transform duration-200" />;
    case 'WAITING':
      return <Circle className="w-6 h-6 text-blue-400 transition-transform duration-200" />;
    case 'PENDING':
      return <Circle className="w-6 h-6 text-gray-300 transition-transform duration-200" />;
  }
};

const getStepColor = (state: StepState) => {
  switch (state) {
    case 'COMPLETED':
      return 'bg-green-100 border-green-300 shadow-sm';
    case 'IN_PROGRESS':
      return 'bg-blue-100 border-blue-300 shadow-sm';
    case 'PAUSED':
      return 'bg-yellow-100 border-yellow-300 shadow-sm';
    case 'FAILED':
      return 'bg-red-100 border-red-300 shadow-sm';
    case 'SKIPPED':
      return 'bg-gray-100 border-gray-300';
    case 'WAITING':
      return 'bg-blue-50 border-blue-200';
    case 'PENDING':
      return 'bg-gray-50 border-gray-200';
  }
};

const getConnectorColor = (currentState: StepState, nextState: StepState) => {
  if (currentState === 'COMPLETED' && nextState === 'COMPLETED') {
    return 'bg-green-300 transition-all duration-500';
  }
  if (currentState === 'COMPLETED' && nextState === 'IN_PROGRESS') {
    return 'bg-gradient-to-r from-green-300 to-blue-300 transition-all duration-500';
  }
  if (currentState === 'COMPLETED' && (nextState === 'WAITING' || nextState === 'PENDING')) {
    return 'bg-gradient-to-r from-green-300 to-gray-200 transition-all duration-500';
  }
  if (currentState === 'COMPLETED') {
    return 'bg-green-300 transition-all duration-500';
  }
  if (currentState === 'IN_PROGRESS') {
    return 'bg-blue-300 transition-all duration-500';
  }
  return 'bg-gray-200 transition-all duration-500';
};

const getPlatformIcon = (platform?: string) => {
  const platformLower = platform?.toLowerCase() || 'linkedin';
  
  switch (platformLower) {
    case 'linkedin':
      return <Linkedin className="w-3 h-3" />;
    case 'email':
      return <Mail className="w-3 h-3" />;
    case 'whatsapp':
      return <MessageCircle className="w-3 h-3" />;
    case 'call':
    case 'sms':
      return <Phone className="w-3 h-3" />;
    case 'instagram':
      return <Instagram className="w-3 h-3" />;
    case 'voice':
      return <Mic className="w-3 h-3" />;
    default:
      return <Linkedin className="w-3 h-3" />;
  }
};

const getPlatformColor = (platform?: string) => {
  const colors: Record<string, string> = {
    linkedin: 'bg-blue-100 text-blue-700',
    email: 'bg-purple-100 text-purple-700',
    whatsapp: 'bg-green-100 text-green-700',
    call: 'bg-orange-100 text-orange-700',
    sms: 'bg-pink-100 text-pink-700',
    instagram: 'bg-pink-100 text-pink-700',
    voice: 'bg-indigo-100 text-indigo-700'
  };
  return colors[platform?.toLowerCase() || 'linkedin'] || 'bg-blue-100 text-blue-700';
};

export const LeadStepperRow: React.FC<LeadStepperRowProps> = ({
  leadId,
  leadName,
  leadLinkedin,
  platform = 'linkedin',
  profileVisited,
  connectionStatus,
  connectionSentWithMessage,
  connectionAccepted,
  contacted,
  contactedStatus,
  leadReplied,
  pauseReason,
  errorMessage,
}) => {
  // Step 1: Profile Visit
  const profileVisitState: StepState = profileVisited ? 'COMPLETED' : 'PENDING';
  const profileVisitTooltip = profileVisited 
    ? 'Profile visited successfully' 
    : 'Profile visit pending';

  // Step 2: Connection Sent
  let connectionState: StepState = 'PENDING';
  let connectionTooltip = 'Connection not sent yet';
  
  if (connectionStatus === 'PAUSED') {
    connectionState = 'PAUSED';
    if (pauseReason === 'DAILY_LIMIT') {
      connectionTooltip = 'Paused: Daily connection limit reached';
    } else if (pauseReason === 'WEEKLY_LIMIT') {
      connectionTooltip = 'Paused: Weekly connection limit reached';
    } else if (pauseReason === 'RATE_LIMIT') {
      connectionTooltip = 'Paused: Rate limit exceeded';
    } else {
      connectionTooltip = 'Paused: Connection request paused';
    }
  } else if (connectionStatus === 'FAILED') {
    connectionState = 'FAILED';
    connectionTooltip = errorMessage || 'Connection request failed';
  } else if (connectionStatus === 'SENT') {
    connectionState = 'COMPLETED';
    connectionTooltip = 'Connection request sent successfully';
  } else if (profileVisited) {
    connectionState = 'IN_PROGRESS';
    connectionTooltip = 'Processing connection request...';
  }

  // Step 3: With Message (Follow-up after connection)
  let connectionWithMessageState: StepState = 'PENDING';
  let connectionWithMessageTooltip = 'Waiting for connection to be sent';
  let connectionWithMessageHelper = '';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    // Connection not sent - show as pending
    connectionWithMessageState = 'PENDING';
    connectionWithMessageTooltip = 'Waiting for connection to be established';
    connectionWithMessageHelper = '';
  } else if (connectionStatus === 'SENT' && !connectionAccepted) {
    // Connection sent but NOT accepted yet - WAITING state
    connectionWithMessageState = 'WAITING';
    connectionWithMessageTooltip = 'Waiting for connection acceptance to send follow-up message';
    connectionWithMessageHelper = 'Waiting for acceptance';
  } else if (connectionAccepted && contacted) {
    // Connection accepted AND message sent - COMPLETED
    connectionWithMessageState = 'COMPLETED';
    connectionWithMessageTooltip = 'Follow-up message sent successfully';
    connectionWithMessageHelper = 'Sent';
  } else if (connectionAccepted && !contacted) {
    // Connection accepted but message NOT sent yet - PENDING/Queued
    connectionWithMessageState = 'PENDING';
    connectionWithMessageTooltip = 'Follow-up message queued and ready to send';
    connectionWithMessageHelper = 'Queued';
  }

  // Step 4: Connection Accepted
  let acceptedState: StepState = 'PENDING';
  let acceptedTooltip = 'Waiting for connection acceptance';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    acceptedState = 'SKIPPED';
    acceptedTooltip = 'Skipped: Connection not sent';
  } else if (connectionStatus === 'SENT') {
    if (connectionAccepted) {
      acceptedState = 'COMPLETED';
      acceptedTooltip = 'Connection accepted by lead';
    } else {
      acceptedState = 'PENDING';
      acceptedTooltip = 'Waiting for lead to accept connection';
    }
  }

  // Step 5: Contacted (Message after acceptance)
  let contactedState: StepState = 'PENDING';
  let contactedTooltip = 'Waiting for connection acceptance';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    contactedState = 'PENDING';
    contactedTooltip = 'Waiting for connection to be established';
  } else if (contacted) {
    // If contacted is true, show as COMPLETED
    contactedState = 'COMPLETED';
    contactedTooltip = 'Follow-up message sent successfully';
  } else if (contactedStatus === 'FAILED') {
    contactedState = 'FAILED';
    contactedTooltip = errorMessage || 'Follow-up message failed';
  } else if (contactedStatus === 'SKIPPED') {
    contactedState = 'SKIPPED';
    contactedTooltip = 'Follow-up message skipped (no message configured)';
  } else if (!connectionAccepted && connectionStatus === 'SENT') {
    contactedState = 'PENDING';
    contactedTooltip = 'Waiting for connection acceptance to send follow-up message';
  } else if (connectionAccepted) {
    contactedState = 'IN_PROGRESS';
    contactedTooltip = 'Preparing to send follow-up message...';
  }

  // Step 6: Lead Contacted Back (Reply received)
  let repliedState: StepState = 'PENDING';
  let repliedTooltip = 'Waiting for lead to reply';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    repliedState = 'SKIPPED';
    repliedTooltip = 'Skipped: Connection not established';
  } else if (!contacted) {
    repliedState = 'PENDING';
    repliedTooltip = 'Waiting for follow-up message to be sent';
  } else if (contacted) {
    if (leadReplied) {
      repliedState = 'COMPLETED';
      repliedTooltip = 'Lead replied to your message';
    } else {
      repliedState = 'PENDING';
      repliedTooltip = 'Waiting for lead to reply';
    }
  }

  const steps: StepConfig[] = [
    { id: 'profile-visit', label: 'Profile Visit', state: profileVisitState, tooltip: profileVisitTooltip },
    { id: 'connection', label: 'Connection Sent', state: connectionState, tooltip: connectionTooltip },
    { id: 'connection-msg', label: 'With Message', state: connectionWithMessageState, tooltip: connectionWithMessageTooltip, helperText: connectionWithMessageHelper },
    { id: 'accepted', label: 'Accepted', state: acceptedState, tooltip: acceptedTooltip },
    { id: 'contacted', label: 'Contacted', state: contactedState, tooltip: contactedTooltip },
    { id: 'replied', label: 'Lead Contacted Back', state: repliedState, tooltip: repliedTooltip },
  ];

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm">
      {/* Lead Info */}
      <div className="flex items-center gap-2 w-52 flex-shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
            {leadName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {leadLinkedin ? (
            <a
              href={leadLinkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block text-sm"
            >
              {leadName || 'Unknown Lead'}
            </a>
          ) : (
            <p className="font-semibold text-gray-900 truncate text-sm">
              {leadName || 'Unknown Lead'}
            </p>
          )}
          {/* Platform Badge */}
          <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${getPlatformColor(platform)} mt-0.5`}>
            {getPlatformIcon(platform)}
          </div>
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="flex items-center flex-1 min-w-0">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 min-w-[85px]">
                    {/* Icon Circle */}
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${getStepColor(step.state)} flex-shrink-0 transition-all duration-300 hover:scale-110`}>
                      {getStepIcon(step.state)}
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-medium text-gray-700 text-center leading-tight transition-colors duration-200">
                      {step.label}
                    </span>
                    {/* Helper Text */}
                    {step.helperText && (
                      <span className="text-[9px] text-gray-500 text-center leading-none mt-0.5">
                        {step.helperText}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{step.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 px-1">
                <div className={`h-[3px] w-full rounded-full ${getConnectorColor(step.state, steps[index + 1].state)}`} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default LeadStepperRow;
