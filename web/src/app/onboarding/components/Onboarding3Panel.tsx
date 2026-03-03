'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatPanel from '@/components/onboarding/ChatPanel';
import WorkflowPreviewPanel from '@/components/onboarding/WorkflowPreviewPanel';
import EditorPanel from '@/components/onboarding/EditorPanel';
import Screen3ManualEditor from '@/app/onboarding/components/Screen3ManualEditor';
import ResizableDivider from '@/components/onboarding/ResizableDivider';
import { ChevronRight, MessageCircle, GitBranch } from 'lucide-react';
interface Onboarding3PanelProps {
  campaignId?: string | null;
}
export default function Onboarding3Panel({ campaignId }: Onboarding3PanelProps) {
  const { hasSelectedOption, isEditMode, isEditorPanelCollapsed, setIsEditorPanelCollapsed, hasRequestedEditor, mobileView, setMobileView, setHasSelectedOption, setSelectedPath } = useOnboardingStore();
  // When campaignId is present, skip option selection
  useEffect(() => {
    if (campaignId) {
      setHasSelectedOption(true);
      setSelectedPath('automation');
    }
  }, [campaignId, setHasSelectedOption, setSelectedPath]);
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
      <AnimatePresence mode="wait">

          {/* Mobile Layout - Show chat with toggle to workflow */}
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:hidden w-full h-full flex flex-col bg-white overflow-hidden pt-14"
          >
            {/* Mobile Toggle Tabs */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex bg-white border-b border-gray-200 shrink-0"
            >
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
          </motion.div>
          {/* Mobile Content */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex-1 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`initial-view-${mobileView}`}
                initial={{ opacity: 0, x: mobileView === 'chat' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mobileView === 'chat' ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                {mobileView === 'chat' ? <ChatPanel /> : <WorkflowPreviewPanel campaignId={campaignId} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
        {/* Desktop Layout */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:block w-full h-full bg-white overflow-hidden"
        >
          <ChatPanel />
        </motion.div>
      </AnimatePresence>
    );
  }
  // When Edit is clicked, show only the full editor (Screen 3)
  if (isEditMode) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="edit-mode"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full h-full overflow-hidden"
        >
          <Screen3ManualEditor />
        </motion.div>
      </AnimatePresence>
    );
  }
  // After selection, show 3-panel layout (full screen)
  // On mobile: show toggle tabs to switch between chat and workflow
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="panel-layout"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className='mt-12 mb-12 w-full h-full'
      >
        {/* Mobile Layout - Toggle between Chat and Workflow */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="md:hidden w-full h-full  flex flex-col bg-gray-50 overflow-hidden pt-14"
        >
          {/* Mobile Toggle Tabs */}
          <motion.div 
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex bg-white border-b border-gray-200 shrink-0"
          >
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
          </motion.div>
        {/* Mobile Content */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex-1 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`layout-view-${mobileView}`}
              initial={{ opacity: 0, x: mobileView === 'chat' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mobileView === 'chat' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {mobileView === 'chat' ? <ChatPanel campaignId={campaignId} /> : <WorkflowPreviewPanel campaignId={campaignId} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
      {/* Desktop Layout - Side by side panels */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="hidden md:flex w-full h-full bg-gray-50 overflow-hidden"
      >
        {/* LEFT PANEL - Chat (Resizable) */}
        <motion.div 
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="border-r border-gray-200 bg-white overflow-hidden flex flex-col h-full"
          style={{ width: `${chatWidth}%`, minWidth: '200px', maxWidth: '70%' }}
        >
          <ChatPanel campaignId={campaignId} />
        </motion.div>
        {/* RESIZABLE DIVIDER 1 - Between Chat and Workflow */}
        <ResizableDivider
          onResize={handleChatResize}
          minWidth={15}
          maxWidth={70}
        />
        {/* MIDDLE PANEL - Workflow Preview (Resizable) */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="border-r border-gray-200 bg-white overflow-hidden relative h-full"
          style={{ 
            width: `${workflowWidth}%`, 
            minWidth: isEditorPanelCollapsed ? '200px' : '15%',
            maxWidth: isEditorPanelCollapsed ? '85%' : '70%'
          }}
        >
          <WorkflowPreviewPanel campaignId={campaignId} />
        {/* Show Editor Button - only appears when user has clicked Edit AND panel is collapsed */}
        <AnimatePresence>
          {isEditorPanelCollapsed && hasRequestedEditor && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsEditorPanelCollapsed(false)}
              className="absolute top-4 right-0 z-20 bg-white border border-gray-200 rounded-l-lg px-3 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              title="Show Editor Panel"
            >
              <ChevronRight className="w-4 h-4" />
              <span>Show Editor</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
      {/* RESIZABLE DIVIDER 2 - Between Workflow and Editor (only when editor is visible) */}
      <AnimatePresence>
        {!isEditorPanelCollapsed && (
          <>
            <ResizableDivider
              onResize={handleWorkflowResize}
              minWidth={15}
              maxWidth={70}
            />
            {/* RIGHT PANEL - Editor (Step Library / Step Settings) - Resizable */}
            <motion.div 
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 30, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white overflow-hidden h-full"
              style={{ width: `${editorWidth}%`, minWidth: '200px', maxWidth: '50%' }}
            >
              <EditorPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
}
