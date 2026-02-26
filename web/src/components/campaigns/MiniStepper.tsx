'use client';
import React from 'react';
import { CheckCircle2, Loader2, Pause, XCircle, Minus, Circle, Linkedin, Mail, MessageCircle, Phone, Instagram, Mic } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type StepState = 'COMPLETED' | 'IN_PROGRESS' | 'PAUSED' | 'FAILED' | 'SKIPPED' | 'PENDING' | 'WAITING';

interface MiniStepperProps {
  platform?: string;
  profileVisited: boolean;
  connectionStatus: 'NOT_SENT' | 'SENT' | 'FAILED' | 'PAUSED';
  connectionAccepted: boolean;
  contacted: boolean;
  contactedStatus?: 'SENT' | 'FAILED' | 'SKIPPED';
  leadReplied: boolean;
  pauseReason?: 'DAILY_LIMIT' | 'WEEKLY_LIMIT' | 'RATE_LIMIT';
  errorMessage?: string;
}

const getMiniStepIcon = (state: StepState) => {
  switch (state) {
    case 'COMPLETED':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'IN_PROGRESS':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    case 'PAUSED':
      return <Pause className="w-4 h-4 text-yellow-600" />;
    case 'FAILED':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'SKIPPED':
      return <Minus className="w-4 h-4 text-gray-400" />;
    case 'WAITING':
      return <Circle className="w-4 h-4 text-blue-400" />;
    case 'PENDING':
      return <Circle className="w-4 h-4 text-gray-300" />;
  }
};

const getMiniStepColor = (state: StepState) => {
  switch (state) {
    case 'COMPLETED':
      return 'bg-green-50 border-green-200';
    case 'IN_PROGRESS':
      return 'bg-blue-50 border-blue-200';
    case 'PAUSED':
      return 'bg-yellow-50 border-yellow-200';
    case 'FAILED':
      return 'bg-red-50 border-red-200';
    case 'SKIPPED':
      return 'bg-gray-50 border-gray-200';
    case 'WAITING':
      return 'bg-blue-50 border-blue-200';
    case 'PENDING':
      return 'bg-gray-50 border-gray-200';
  }
};

const getMiniConnectorColor = (currentState: StepState) => {
  if (currentState === 'COMPLETED') {
    return 'bg-green-300';
  }
  if (currentState === 'IN_PROGRESS') {
    return 'bg-blue-300';
  }
  return 'bg-gray-200';
};

const getPlatformIcon = (platform?: string) => {
  const platformLower = platform?.toLowerCase() || 'linkedin';
  const iconClass = "w-3.5 h-3.5";
  
  switch (platformLower) {
    case 'linkedin':
      return <Linkedin className={`${iconClass} text-blue-600`} />;
    case 'email':
      return <Mail className={`${iconClass} text-purple-600`} />;
    case 'whatsapp':
      return <MessageCircle className={`${iconClass} text-green-600`} />;
    case 'call':
    case 'sms':
      return <Phone className={`${iconClass} text-orange-600`} />;
    case 'instagram':
      return <Instagram className={`${iconClass} text-pink-600`} />;
    case 'voice':
      return <Mic className={`${iconClass} text-indigo-600`} />;
    default:
      return <Linkedin className={`${iconClass} text-blue-600`} />;
  }
};

const getPlatformColor = (platform?: string) => {
  const colors: Record<string, string> = {
    linkedin: 'bg-blue-100 text-blue-700 border-blue-200',
    email: 'bg-purple-100 text-purple-700 border-purple-200',
    whatsapp: 'bg-green-100 text-green-700 border-green-200',
    call: 'bg-orange-100 text-orange-700 border-orange-200',
    sms: 'bg-pink-100 text-pink-700 border-pink-200',
    instagram: 'bg-pink-100 text-pink-700 border-pink-200',
    voice: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  };
  return colors[platform?.toLowerCase() || 'linkedin'] || 'bg-blue-100 text-blue-700 border-blue-200';
};

export const MiniStepper: React.FC<MiniStepperProps> = ({
  platform = 'linkedin',
  profileVisited,
  connectionStatus,
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
    ? 'Profile visited' 
    : 'Profile visit pending';

  // Step 2: Connection Sent
  let connectionState: StepState = 'PENDING';
  let connectionTooltip = 'Connection not sent yet';
  
  if (connectionStatus === 'PAUSED') {
    connectionState = 'PAUSED';
    if (pauseReason === 'DAILY_LIMIT') {
      connectionTooltip = 'Paused: Daily limit';
    } else if (pauseReason === 'WEEKLY_LIMIT') {
      connectionTooltip = 'Paused: Weekly limit';
    } else if (pauseReason === 'RATE_LIMIT') {
      connectionTooltip = 'Paused: Rate limit';
    } else {
      connectionTooltip = 'Paused';
    }
  } else if (connectionStatus === 'FAILED') {
    connectionState = 'FAILED';
    connectionTooltip = errorMessage || 'Connection failed';
  } else if (connectionStatus === 'SENT') {
    connectionState = 'COMPLETED';
    connectionTooltip = 'Connection sent';
  } else if (profileVisited) {
    connectionState = 'IN_PROGRESS';
    connectionTooltip = 'Processing...';
  }

  // Step 3: With Message
  let connectionWithMessageState: StepState = 'PENDING';
  let connectionWithMessageTooltip = 'Waiting for connection';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    connectionWithMessageState = 'PENDING';
    connectionWithMessageTooltip = 'Waiting for connection';
  } else if (connectionStatus === 'SENT' && !connectionAccepted) {
    connectionWithMessageState = 'WAITING';
    connectionWithMessageTooltip = 'Waiting for acceptance';
  } else if (connectionAccepted && contacted) {
    connectionWithMessageState = 'COMPLETED';
    connectionWithMessageTooltip = 'Message sent';
  } else if (connectionAccepted && !contacted) {
    connectionWithMessageState = 'PENDING';
    connectionWithMessageTooltip = 'Message queued';
  }

  // Step 4: Connection Accepted
  let acceptedState: StepState = 'PENDING';
  let acceptedTooltip = 'Waiting for acceptance';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    acceptedState = 'SKIPPED';
    acceptedTooltip = 'Skipped';
  } else if (connectionStatus === 'SENT') {
    if (connectionAccepted) {
      acceptedState = 'COMPLETED';
      acceptedTooltip = 'Connection accepted';
    } else {
      acceptedState = 'PENDING';
      acceptedTooltip = 'Waiting for acceptance';
    }
  }

  // Step 5: Contacted
  let contactedState: StepState = 'PENDING';
  let contactedTooltip = 'Waiting for connection';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    contactedState = 'PENDING';
    contactedTooltip = 'Waiting for connection';
  } else if (contacted) {
    contactedState = 'COMPLETED';
    contactedTooltip = 'Follow-up sent';
  } else if (contactedStatus === 'FAILED') {
    contactedState = 'FAILED';
    contactedTooltip = errorMessage || 'Failed';
  } else if (contactedStatus === 'SKIPPED') {
    contactedState = 'SKIPPED';
    contactedTooltip = 'Skipped';
  } else if (!connectionAccepted && connectionStatus === 'SENT') {
    contactedState = 'PENDING';
    contactedTooltip = 'Waiting for acceptance';
  } else if (connectionAccepted) {
    contactedState = 'IN_PROGRESS';
    contactedTooltip = 'Preparing message...';
  }

  // Step 6: Lead Replied
  let repliedState: StepState = 'PENDING';
  let repliedTooltip = 'Waiting for lead to contact back';
  
  if (connectionStatus === 'PAUSED' || connectionStatus === 'FAILED') {
    repliedState = 'SKIPPED';
    repliedTooltip = 'Skipped';
  } else if (!contacted) {
    repliedState = 'PENDING';
    repliedTooltip = 'Waiting for message to be sent';
  } else if (contacted) {
    if (leadReplied) {
      repliedState = 'COMPLETED';
      repliedTooltip = 'Lead contacted back';
    } else {
      repliedState = 'PENDING';
      repliedTooltip = 'Waiting for lead to contact back';
    }
  }

  const steps = [
    { id: 'profile', label: 'Visit', state: profileVisitState, tooltip: profileVisitTooltip },
    { id: 'connection', label: 'Connect', state: connectionState, tooltip: connectionTooltip },
    { id: 'message', label: 'Message', state: connectionWithMessageState, tooltip: connectionWithMessageTooltip },
    { id: 'accepted', label: 'Accept', state: acceptedState, tooltip: acceptedTooltip },
    { id: 'contacted', label: 'Contact', state: contactedState, tooltip: contactedTooltip },
    { id: 'replied', label: 'Lead Back', state: repliedState, tooltip: repliedTooltip },
  ];

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${getMiniStepColor(step.state)} flex-shrink-0 transition-all duration-200`}>
                  {getMiniStepIcon(step.state)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">{step.label}</p>
                <p className="text-xs text-gray-400">{step.tooltip}</p>
                <p className="text-xs text-gray-400 capitalize">Platform: {platform || 'LinkedIn'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {index < steps.length - 1 && (
            <div className={`h-[2px] w-2 flex-shrink-0 ${getMiniConnectorColor(step.state)}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default MiniStepper;
