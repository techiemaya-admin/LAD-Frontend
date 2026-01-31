'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
interface StepLayoutProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  onBack: () => void;
  children: React.ReactNode;
  showProgress?: boolean;
  onStepClick?: (step: number) => void;
}
export default function StepLayout({
  currentStep,
  totalSteps,
  stepTitle,
  onBack,
  children,
  showProgress = true,
  onStepClick,
}: StepLayoutProps) {
  return (
    <div className="h-full max-h-full flex flex-col bg-white overflow-hidden">
      {/* Header with Back Navigation */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-2 shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {showProgress && (
            <Badge variant="secondary" className="text-gray-600 font-medium text-xs">
              Step {currentStep} of {totalSteps}
            </Badge>
          )}
          <h2 className="font-semibold text-lg text-gray-900">
            {stepTitle}
          </h2>
        </div>
      </div>
      {/* Progress Dots */}
      {showProgress && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 shrink-0">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const isClickable = onStepClick && (isCompleted || stepNum === currentStep);
            return (
              <div
                key={stepNum}
                onClick={() => isClickable && onStepClick(stepNum)}
                className={`flex-1 h-[3px] rounded-sm transition-all duration-300 ${
                  isActive || isCompleted ? 'bg-indigo-500' : 'bg-gray-200'
                } ${
                  isClickable ? 'cursor-pointer hover:h-1' : 'cursor-default'
                } ${
                  isActive ? 'animate-pulse' : ''
                }`}
              />
            );
          })}
        </div>
      )}
      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {children}
      </div>
    </div>
  );
}
