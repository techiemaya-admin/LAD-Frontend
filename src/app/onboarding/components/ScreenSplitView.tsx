'use client';
import React from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ScreenAIChat from './ScreenAIChat';
import WorkflowPreview from '@/components/onboarding/WorkflowPreview';
import Screen3ManualEditor from './Screen3ManualEditor';
export default function ScreenSplitView() {
  return (
    <div className="flex w-full h-full bg-white overflow-hidden">
      {/* Screen 1 - AI Chat (40%) */}
      <div className="w-[40%] border-r border-gray-200 overflow-hidden">
        <ScreenAIChat />
      </div>
      {/* Screen 2 - Workflow Preview (30%) */}
      <div className="w-[30%] border-r border-gray-200 overflow-hidden">
        <WorkflowPreview />
      </div>
      {/* Screen 3 - Manual Editor (30%) */}
      <div className="w-[30%] overflow-hidden">
        <Screen3ManualEditor />
      </div>
    </div>
  );
}