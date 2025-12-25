'use client';

import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import OnboardingStepLibrary from '@/components/onboarding/OnboardingStepLibrary';
import StepSettings from '../../features/campaigns/components/StepSettings';
import { Save, BookOpen, Settings, Undo2, Redo2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EditorPanel() {
  const [activeTab, setActiveTab] = useState<'library' | 'settings'>('library');
  const router = useRouter();
  const { 
    selectedNodeId, 
    workflowPreview, 
    manualFlow,
    setWorkflowPreview, 
    completeOnboarding,
    setIsEditorPanelCollapsed,
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useOnboardingStore();

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) {
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  const handleUndo = () => {
    if (canUndo()) {
      undo();
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      redo();
    }
  };

  const handleSave = async () => {
    try {
      const { apiPost } = await import('@/lib/api');
      const workflowToSave = manualFlow || {
        nodes: workflowPreview.map((step) => ({
          id: step.id,
          type: step.type,
          data: step,
        })),
        edges: [],
      };
      
      await apiPost('/api/workflow/save', {
        workflow: workflowToSave,
      });

      completeOnboarding();
      router.push('/campaigns');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow. Please try again.');
    }
  };

  const handleClose = () => {
    setIsEditorPanelCollapsed(true);
  };

  return (
    <div className="h-full flex flex-col bg-white shadow-xl rounded-tl-xl">
      {/* Header with Tabs - Sticky */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 rounded-tl-xl">
        {/* Top Bar with Close, Undo, Redo, Save */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1">
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all duration-200 group"
              title="Close Editor Panel"
            >
              <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo()}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Tab Navigation - Sticky */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'library'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Step Library
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Step Settings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' ? (
          <div className="h-full overflow-y-auto">
            <OnboardingStepLibrary />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {selectedNodeId ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <StepSettings />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a step to configure
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Click on any step in the workflow preview to edit its settings
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

