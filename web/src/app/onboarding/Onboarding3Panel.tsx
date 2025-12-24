'use client';

import React from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatPanel from '@/components/onboarding/ChatPanel';
import WorkflowPreviewPanel from '@/components/onboarding/WorkflowPreviewPanel';
import EditorPanel from '@/components/onboarding/EditorPanel';
import Screen3ManualEditor from '@/app/onboarding/Screen3ManualEditor';
import { ChevronRight } from 'lucide-react';

export default function Onboarding3Panel() {
  const { hasSelectedOption, isEditMode, isEditorPanelCollapsed, setIsEditorPanelCollapsed } = useOnboardingStore();

  // Initially show only chat with option cards
  if (!hasSelectedOption) {
    return (
      <div className="w-full h-screen bg-white overflow-hidden">
        <ChatPanel />
      </div>
    );
  }

  // When Edit is clicked, show only the full editor (Screen 3)
  if (isEditMode) {
    return (
      <div className="w-full h-screen overflow-hidden">
        <Screen3ManualEditor />
      </div>
    );
  }

  // After selection, show 3-panel layout (full screen)
  return (
    <div className="w-full h-screen flex bg-gray-50 overflow-hidden">
      {/* LEFT PANEL - 40% or 30% based on collapse state */}
      <div className={`${isEditorPanelCollapsed ? 'w-[30%]' : 'w-[40%]'} border-r border-gray-200 bg-white overflow-hidden flex flex-col h-full transition-all duration-300 ease-in-out`}>
        <ChatPanel />
      </div>

      {/* MIDDLE PANEL - 30% or 70% based on collapse state */}
      <div className={`${isEditorPanelCollapsed ? 'w-[70%]' : 'w-[30%]'} border-r border-gray-200 bg-white overflow-hidden relative transition-all duration-300 ease-in-out`}>
        <WorkflowPreviewPanel />
        
        {/* Show Editor Button - appears when panel is collapsed */}
        {isEditorPanelCollapsed && (
          <button
            onClick={() => setIsEditorPanelCollapsed(false)}
            className="absolute top-4 right-0 z-20 bg-white border border-gray-200 rounded-l-lg px-3 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            title="Show Editor Panel"
          >
            <ChevronRight className="w-4 h-4" />
            <span>Show Editor</span>
          </button>
        )}
      </div>

      {/* RIGHT PANEL - 30% - Editor (Step Library / Step Settings) - Collapsible */}
      <div className={`${isEditorPanelCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[30%] opacity-100'} bg-white overflow-hidden transition-all duration-300 ease-in-out`}>
        <EditorPanel />
      </div>
    </div>
  );
}

