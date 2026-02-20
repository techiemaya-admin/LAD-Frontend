'use client';
import React from 'react';
import { Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface StatusStepperProps {
  currentStep: number; // 1-5
}

export const StatusStepper: React.FC<StatusStepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Visit' },
    { id: 2, label: 'Connect' },
    { id: 3, label: 'Accept' },
    { id: 4, label: 'Contact' },
    { id: 5, label: 'Lead Contact Back' },
  ];

  const getStepState = (stepId: number): 'completed' | 'active' | 'upcoming' => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-between w-full px-2 py-2">
      {steps.map((step, index) => {
        const state = getStepState(step.id);
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            {/* Circle Node with Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium transition-all flex-shrink-0 cursor-pointer
                      ${
                        state === 'completed'
                          ? 'bg-[#0b1957] text-white'
                          : state === 'active'
                          ? 'bg-white border-2 border-[#0b1957] text-[#0b1957]'
                          : 'bg-[#E5E7EB] text-[#9CA3AF]'
                      }
                    `}
                  >
                    {state === 'completed' ? (
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{step.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={`
                  h-[2px] flex-1 transition-all
                  ${
                    state === 'completed'
                      ? 'bg-[#0b1957]'
                      : 'bg-[#D9D9D9]'
                  }
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
