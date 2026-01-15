'use client';

import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatPanel from '@/components/onboarding/ChatPanel';
import WorkflowPreviewPanel from '@/components/onboarding/WorkflowPreviewPanel';
import EditorPanel from '@/components/onboarding/EditorPanel';
import Screen3ManualEditor from '@/app/onboarding/Screen3ManualEditor';
import ResizableDivider from '@/components/onboarding/ResizableDivider';
import { ChevronRight, MessageCircle, GitBranch } from 'lucide-react';

export default function Onboarding3Panel() {
  const { hasSelectedOption, isEditMode, isEditorPanelCollapsed, setIsEditorPanelCollapsed, hasRequestedEditor, mobileView, setMobileView } = useOnboardingStore();
  
  // Panel widths as percentages
  const [chatWidth, setChatWidth] = useState(40); // Left panel (Chat)
  const [workflowWidth, setWorkflowWidth] = useState(30); // Middle panel (Workflow Preview)
  const [editorWidth, setEditorWidth] = useState(30); // Right panel (Editor)
  
  // Load saved widths from localStorage
  useEffect(() => {
    const savedChatWidth = localStorage.getItem('onboarding-chat-width');
    const savedWorkflowWidth = localStorage.getItem('onboarding-workflow-width');
    const savedEditorWidth = localStorage.getItem('onboarding-editor-width');
    
    if (savedChatWidth) setChatWidth(parseFloat(savedChatWidth));
    if (savedWorkflowWidth) setWorkflowWidth(parseFloat(savedWorkflowWidth));
    if (savedEditorWidth) setEditorWidth(parseFloat(savedEditorWidth));
  }, []);
  
  // Save widths to localStorage when they change
  useEffect(() => {
    localStorage.setItem('onboarding-chat-width', chatWidth.toString());
  }, [chatWidth]);
  
  useEffect(() => {
    localStorage.setItem('onboarding-workflow-width', workflowWidth.toString());
  }, [workflowWidth]);
  
  useEffect(() => {
    localStorage.setItem('onboarding-editor-width', editorWidth.toString());
  }, [editorWidth]);
  
  // Update widths when editor panel is collapsed/expanded
  useEffect(() => {
    if (isEditorPanelCollapsed) {
      // When collapsing, give all space to workflow
      setWorkflowWidth(100 - chatWidth);
    } else {
      // When expanding, restore previous workflow width or use default
      const savedWorkflow = localStorage.getItem('onboarding-workflow-width');
      if (savedWorkflow) {
        const wf = parseFloat(savedWorkflow);
        const ed = 100 - chatWidth - wf;
        if (ed >= 15 && wf >= 15) {
          setWorkflowWidth(wf);
          setEditorWidth(ed);
        } else {
          // Reset to defaults if saved values don't work
          setWorkflowWidth(30);
          setEditorWidth(30);
        }
      }
    }
  }, [isEditorPanelCollapsed, chatWidth]);
  
  // Handle resizing between chat and workflow panels
  const handleChatResize = (newWidth: number) => {
    const remaining = 100 - newWidth;
    const workflowRatio = workflowWidth / (workflowWidth + editorWidth || 1);
    const editorRatio = editorWidth / (workflowWidth + editorWidth || 1);
    
    setChatWidth(newWidth);
    if (!isEditorPanelCollapsed) {
      setWorkflowWidth(remaining * workflowRatio);
      setEditorWidth(remaining * editorRatio);
    } else {
      setWorkflowWidth(remaining);
    }
  };
  
  // Handle resizing between workflow and editor panels
  const handleWorkflowResize = (newWidth: number) => {
    if (isEditorPanelCollapsed) return;
    
    const remaining = 100 - chatWidth;
    const newEditorWidth = remaining - newWidth;
    
    if (newEditorWidth >= 15 && newWidth >= 15) {
      setWorkflowWidth(newWidth);
      setEditorWidth(newEditorWidth);
    }
  };

  // Initially show only chat with option cards
  if (!hasSelectedOption) {
    return (
      <>
        {/* Mobile Layout - Show chat with toggle to workflow */}
        <div className="md:hidden w-full h-full flex flex-col bg-white overflow-hidden pt-14">
          {/* Mobile Toggle Tabs */}
          <div className="flex bg-white border-b border-gray-200 shrink-0">
            <button
              onClick={() => setMobileView('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                mobileView === 'chat'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setMobileView('workflow')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                mobileView === 'workflow'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Workflow
            </button>
          </div>
          
          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden">
            {mobileView === 'chat' ? <ChatPanel /> : <WorkflowPreviewPanel />}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block w-full h-full bg-white overflow-hidden">
          <ChatPanel />
        </div>
      </>
    );
  }

  // When Edit is clicked, show only the full editor (Screen 3)
  if (isEditMode) {
    return (
      <div className="w-full h-full overflow-hidden">
        <Screen3ManualEditor />
      </div>
    );
  }

  // After selection, show 3-panel layout (full screen)
  // On mobile: show toggle tabs to switch between chat and workflow
  return (
    <>
      {/* Mobile Layout - Toggle between Chat and Workflow */}
      <div className="md:hidden w-full h-full flex flex-col bg-gray-50 overflow-hidden pt-14">
        {/* Mobile Toggle Tabs */}
        <div className="flex bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setMobileView('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
              mobileView === 'chat'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMobileView('workflow')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
              mobileView === 'workflow'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Workflow
          </button>
        </div>
        
        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileView === 'chat' ? <ChatPanel /> : <WorkflowPreviewPanel />}
        </div>
      </div>

      {/* Desktop Layout - Side by side panels */}
      <div className="hidden md:flex w-full h-full bg-gray-50 overflow-hidden">
        {/* LEFT PANEL - Chat (Resizable) */}
        <div 
          className="border-r border-gray-200 bg-white overflow-hidden flex flex-col h-full"
          style={{ width: `${chatWidth}%`, minWidth: '200px', maxWidth: '70%' }}
        >
          <ChatPanel />
        </div>

        {/* RESIZABLE DIVIDER 1 - Between Chat and Workflow */}
        <ResizableDivider
          onResize={handleChatResize}
          minWidth={15}
          maxWidth={70}
        />

        {/* MIDDLE PANEL - Workflow Preview (Resizable) */}
        <div 
          className="border-r border-gray-200 bg-white overflow-hidden relative h-full"
          style={{ 
            width: `${workflowWidth}%`, 
            minWidth: isEditorPanelCollapsed ? '200px' : '15%',
            maxWidth: isEditorPanelCollapsed ? '85%' : '70%'
          }}
        >
          <WorkflowPreviewPanel />
        
        {/* Show Editor Button - only appears when user has clicked Edit AND panel is collapsed */}
        {isEditorPanelCollapsed && hasRequestedEditor && (
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

      {/* RESIZABLE DIVIDER 2 - Between Workflow and Editor (only when editor is visible) */}
      {!isEditorPanelCollapsed && (
        <>
          <ResizableDivider
            onResize={handleWorkflowResize}
            minWidth={15}
            maxWidth={70}
          />

          {/* RIGHT PANEL - Editor (Step Library / Step Settings) - Resizable */}
          <div 
            className="bg-white overflow-hidden h-full"
            style={{ width: `${editorWidth}%`, minWidth: '200px', maxWidth: '50%' }}
          >
            <EditorPanel />
          </div>
        </>
      )}
      </div>
    </>
  );
}

