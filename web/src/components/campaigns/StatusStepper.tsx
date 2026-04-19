'use client';
import React from 'react';
import {
  Eye,
  UserPlus,
  UserCheck,
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  Bell,
  Reply,
  Users,
  Clock,
  Smartphone,
  Zap,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface WorkflowStep {
  id: number;
  label: string;
  type: string;
}

interface StatusStepperProps {
  currentStep: number; // 1-based index of the active step
  steps?: WorkflowStep[]; // Dynamic steps from campaign workflow
}

// ─── Icon map ──────────────────────────────────────────────────────────────
const STEP_TYPE_ICON: Record<string, React.ElementType> = {
  linkedin_visit:     Eye,
  linkedin_connect:   UserPlus,
  linkedin_message:   MessageSquare,
  linkedin_follow:    Bell,
  wait_for_condition: UserCheck,
  voice_agent_call:   Phone,
  voice_call:         Phone,
  call:               Phone,
  email_send:         Mail,
  email:              Mail,
  whatsapp_send:      MessageCircle,
  whatsapp:           MessageCircle,
  sms:                Smartphone,
  reply:              Reply,
  lead_generation:    Users,
  delay:              Clock,
};

/** Fallback static steps used when no dynamic campaign steps are provided */
const DEFAULT_STEPS: WorkflowStep[] = [
  { id: 1, label: 'Visit',             type: 'linkedin_visit' },
  { id: 2, label: 'Connect',           type: 'linkedin_connect' },
  { id: 3, label: 'Accept',            type: 'wait_for_condition' },
  { id: 4, label: 'Contact',           type: 'linkedin_message' },
  { id: 5, label: 'Lead Contact Back', type: 'reply' },
];

export const StatusStepper: React.FC<StatusStepperProps> = ({ currentStep, steps }) => {
  const resolvedSteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;

  const getState = (stepId: number): 'completed' | 'active' | 'upcoming' => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'upcoming';
  };

  return (
    <div className="flex items-center w-full px-1 py-2">
      {resolvedSteps.map((step, index) => {
        const state = getState(step.id);
        const isLast = index === resolvedSteps.length - 1;
        const IconComponent = STEP_TYPE_ICON[step.type] ?? Zap;

        return (
          <React.Fragment key={step.id}>
            {/* ── Circle node ── */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrapper for the dot + optional completed-ring */}
                  <div className="relative flex-shrink-0 cursor-default">
                    <div
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center
                        transition-all duration-200
                        ${
                          state === 'completed'
                            ? 'bg-[#0b1957] text-white shadow-sm'
                            : state === 'active'
                            ? 'bg-white border-2 border-[#0b1957] text-[#0b1957] shadow-md'
                            : 'bg-[#F1F5F9] border-2 border-[#CBD5E1] text-[#94A3B8]'
                        }
                      `}
                    >
                      {/* Always show the step-type icon — colour conveys state */}
                      <IconComponent className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>

                    {/* Small green check badge for completed steps */}
                    {state === 'completed' && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
                                   bg-emerald-500 flex items-center justify-center ring-1 ring-white"
                      >
                        {/* tiny SVG checkmark — avoids importing another Lucide icon at this size */}
                        <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}

                    {/* Pulsing ring for the active step */}
                    {state === 'active' && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#0b1957]" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="px-2 py-1">
                  <p className="text-xs font-medium">
                    {state === 'completed' ? '✓ ' : ''}{step.label}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* ── Connector line ── */}
            {!isLast && (
              <div
                className={`
                  h-[2px] flex-1 mx-1 transition-all duration-200
                  ${state === 'completed' ? 'bg-[#0b1957]' : 'bg-[#D9D9D9]'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StatusStepper;
