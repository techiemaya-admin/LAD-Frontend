'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import ChatMessageBubble from '@/components/onboarding/ChatMessageBubble';
import WorkflowPreview from '@/components/onboarding/WorkflowPreview';
import { Loader2, Bot } from 'lucide-react';
export default function SplitScreenOnboarding() {
  const {
    chatHistory,
    addChatMessage,
    setMainOption,
    setWorkflowPreview,
    addWorkflowStep,
    setCurrentQuestion,
    mainOption,
    leadType,
    setLeadType,
    channels,
    setChannelConnection,
    completeOnboarding,
  } = useOnboardingStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userName, setUserName] = useState('there');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [automationQuestionIndex, setAutomationQuestionIndex] = useState(0);
  const [outboundQuestionIndex, setOutboundQuestionIndex] = useState(0);
  const [outboundAnswers, setOutboundAnswers] = useState<Record<string, any>>({});
  // Get user name on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          const name = user.name || user.firstName || user.username || 'there';
          setUserName(name.split(' ')[0] || 'there');
        }
      } catch (e) {
        // Use default
      }
    }
  }, []);
  // Scroll when messages exist
  useEffect(() => {
    if (chatHistory.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);
  // Start onboarding flow
  useEffect(() => {
    if (!hasStarted && chatHistory.length === 0) {
      setTimeout(() => {
        setHasStarted(true);
        addChatMessage('ai', `Hi! I'll help you set up your automation system.\n\nWhich of these paths best fits your needs?`);
        setCurrentQuestion('main-option');
      }, 500);
    }
  }, []);
  const handleOptionSelect = (option: 'automation' | 'leads') => {
    setMainOption(option);
    addChatMessage('user', option === 'automation' ? 'Automation Suite' : 'Lead Generation & Outreach');
    setIsProcessing(true);
    setTimeout(() => {
      if (option === 'automation') {
        askAutomationQuestions();
      } else {
        askLeadGenerationQuestions();
      }
      setIsProcessing(false);
    }, 500);
  };
  const automationQuestions = [
    { key: 'linkedin_autopost', text: 'Do you want LinkedIn autoposting?', step: { type: 'linkedin_autopost', title: 'LinkedIn Auto Post', channel: 'linkedin', icon: 'linkedin' } },
    { key: 'instagram_autopost', text: 'Do you want Instagram autoposting?', step: { type: 'instagram_autopost', title: 'Instagram Auto Post', channel: 'instagram', icon: 'instagram' } },
    { key: 'auto_comments', text: 'Do you want auto-commenting?', step: { type: 'linkedin_comment_reply', title: 'Auto Comment', channel: 'linkedin', icon: 'comment' } },
    { key: 'auto_messaging', text: 'Do you want auto-messaging?', step: { type: 'linkedin_message', title: 'Auto Message', channel: 'linkedin', icon: 'message' } },
    { key: 'whatsapp', text: 'Do you want WhatsApp automation?', step: { type: 'whatsapp_send', title: 'WhatsApp Message', channel: 'whatsapp', icon: 'whatsapp' } },
    { key: 'voice_agent', text: 'Do you want Voice Agent automation?', step: { type: 'voice_agent_call', title: 'Voice Agent Call', channel: 'voice', icon: 'phone' } },
  ];
  const askAutomationQuestions = () => {
    if (automationQuestionIndex < automationQuestions.length) {
      const q = automationQuestions[automationQuestionIndex];
      addChatMessage('ai', q.text);
      setCurrentQuestion(q.key);
    } else {
      // All questions asked, show completion
      addChatMessage('ai', 'Perfect! I\'ve set up your automation workflow. You can review it on the right and make any adjustments.');
      setCurrentQuestion(null);
    }
  };
  const askLeadGenerationQuestions = () => {
    addChatMessage('ai', 'Great! Do you have leads already, or would you like us to generate them for you?');
    setCurrentQuestion('lead-type');
  };
  const handleAnswer = (answer: string | boolean, questionKey?: string) => {
    if (questionKey === 'main-option') {
      // Already handled by handleOptionSelect
      return;
    }
    if (questionKey === 'lead-type') {
      const isInbound = answer === 'inbound' || answer === 'I have leads' || answer === 'I already have leads';
      setLeadType(isInbound ? 'inbound' : 'outbound');
      addChatMessage('user', isInbound ? 'I have leads' : 'Generate leads for me');
      if (isInbound) {
        setTimeout(() => {
          addChatMessage('ai', 'Perfect! Please upload your Excel or CSV file with your leads.');
          setCurrentQuestion('inbound-upload');
        }, 500);
      } else {
        setTimeout(() => {
          askOutboundQuestions();
        }, 500);
      }
      return;
    }
    // Handle automation questions
    if (mainOption === 'automation' && questionKey) {
      const isYes = answer === true || answer === 'yes' || answer === 'Yes' || answer === 'y';
      if (isYes) {
        // Add step to workflow preview
        const question = automationQuestions.find(q => q.key === questionKey);
        if (question) {
          addWorkflowStep({
            id: `step_${Date.now()}`,
            type: question.step.type as any,
            title: question.step.title,
            channel: question.step.channel as any,
            icon: question.step.icon,
          });
          // Update channel connection
          if (question.step.channel === 'linkedin') setChannelConnection('linkedin', true);
          if (question.step.channel === 'instagram') setChannelConnection('instagram', true);
          if (question.step.channel === 'whatsapp') setChannelConnection('whatsapp', true);
          if (question.step.channel === 'voice') setChannelConnection('voiceAgent', true);
        }
      }
      // Ask next question
      const nextIndex = automationQuestionIndex + 1;
      setAutomationQuestionIndex(nextIndex);
      setTimeout(() => {
        if (nextIndex < automationQuestions.length) {
          const nextQ = automationQuestions[nextIndex];
          addChatMessage('ai', nextQ.text);
          setCurrentQuestion(nextQ.key);
        } else {
          addChatMessage('ai', 'Perfect! I\'ve set up your automation workflow. You can review it on the right.');
          setCurrentQuestion(null);
        }
      }, 500);
    }
  };
  const outboundQuestions = [
    { key: 'industry', text: 'What industry are you targeting? (e.g., SaaS, Healthcare, Finance)' },
    { key: 'jobTitles', text: 'What job titles are you looking for? (e.g., CEO, Marketing Director)' },
    { key: 'locations', text: 'What locations? (e.g., United States, New York)' },
    { key: 'companySize', text: 'What company size? (e.g., 10-100 employees)' },
    { key: 'volume', text: 'How many leads do you need? (e.g., 100, 500, 1000)' },
  ];
  const askOutboundQuestions = () => {
    if (outboundQuestionIndex < outboundQuestions.length) {
      const q = outboundQuestions[outboundQuestionIndex];
      addChatMessage('ai', q.text);
      setCurrentQuestion(q.key);
    } else {
      // Build outreach workflow
      buildOutreachWorkflow();
      addChatMessage('ai', 'Perfect! I\'ve created your outreach workflow. You can review it on the right.');
      setCurrentQuestion(null);
    }
  };
  const handleOutboundAnswer = (answer: string) => {
    const currentQ = outboundQuestions[outboundQuestionIndex];
    if (currentQ) {
      setOutboundAnswers({ ...outboundAnswers, [currentQ.key]: answer });
      addChatMessage('user', answer);
      const nextIndex = outboundQuestionIndex + 1;
      setOutboundQuestionIndex(nextIndex);
      setTimeout(() => {
        if (nextIndex < outboundQuestions.length) {
          const nextQ = outboundQuestions[nextIndex];
          addChatMessage('ai', nextQ.text);
          setCurrentQuestion(nextQ.key);
        } else {
          buildOutreachWorkflow();
          addChatMessage('ai', 'Perfect! I\'ve created your outreach workflow. You can review it on the right.');
          setCurrentQuestion(null);
        }
      }, 500);
    }
  };
  const buildOutreachWorkflow = () => {
    const steps = [
      { type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', icon: 'linkedin' },
      { type: 'linkedin_connect', title: 'Send Connection Request', channel: 'linkedin', icon: 'linkedin' },
      { type: 'condition', title: 'If Connected', channel: 'linkedin', icon: 'condition' },
      { type: 'linkedin_message', title: 'Send LinkedIn Message', channel: 'linkedin', icon: 'message' },
      { type: 'delay', title: 'Wait 2 Days', channel: undefined, icon: 'delay' },
      { type: 'email_send', title: 'Send Follow-up Email', channel: 'email', icon: 'email' },
      { type: 'delay', title: 'Wait 1 Day', channel: undefined, icon: 'delay' },
      { type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', icon: 'whatsapp' },
    ];
    setWorkflowPreview(steps.map((step, index) => ({
      id: `step_${index}`,
      ...step,
    })));
    // Connect channels
    setChannelConnection('linkedin', true);
    setChannelConnection('email', true);
    setChannelConnection('whatsapp', true);
  };
  const handleSend = async (message: string) => {
    if (!message.trim() || isProcessing) return;
    const { currentQuestion: currentQ } = useOnboardingStore.getState();
    if (currentQ === 'main-option') {
      if (message.toLowerCase().includes('automation')) {
        handleOptionSelect('automation');
      } else if (message.toLowerCase().includes('lead') || message.toLowerCase().includes('outreach')) {
        handleOptionSelect('leads');
      }
    } else if (currentQ === 'lead-type') {
      handleAnswer(message, 'lead-type');
    } else if (currentQ === 'inbound-upload') {
      // File upload will be handled separately
      addChatMessage('user', 'File uploaded');
    } else if (currentQ && mainOption === 'automation') {
      handleAnswer(message, currentQ);
    } else if (currentQ && mainOption === 'leads' && leadType === 'outbound') {
      handleOutboundAnswer(message);
    }
  };
  return (
    <div className="flex w-full h-full bg-white">
      {/* LEFT PANEL - CHAT (60%) */}
      <div className="w-[60%] border-r border-gray-200 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-3xl font-semibold text-gray-900 mb-3">
                  Hey there, {userName} 👋
                </h1>
              </div>
            </div>
          ) : (
            <div className="py-8">
              {chatHistory.map((message, index) => (
                <ChatMessageBubble
                  key={index}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
              {isProcessing && (
                <div className="flex gap-4 w-full max-w-3xl mx-auto px-4 py-6 bg-white">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400 text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              {/* Option Buttons */}
              {useOnboardingStore.getState().currentQuestion === 'main-option' && (
                <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3">
                  <button
                    onClick={() => handleOptionSelect('automation')}
                    className="w-full text-left px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <div className="font-semibold text-gray-900 mb-1">Automation Suite</div>
                    <div className="text-sm text-gray-600">LinkedIn, Instagram, messaging, and voice automation</div>
                  </button>
                  <button
                    onClick={() => handleOptionSelect('leads')}
                    className="w-full text-left px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                  >
                    <div className="font-semibold text-gray-900 mb-1">Lead Generation & Outreach</div>
                    <div className="text-sm text-gray-600">Find and engage with your ideal customers</div>
                  </button>
                </div>
              )}
              {/* Yes/No Buttons for automation questions */}
              {mainOption === 'automation' && 
               useOnboardingStore.getState().currentQuestion && 
               useOnboardingStore.getState().currentQuestion !== 'main-option' && (
                <div className="w-full max-w-3xl mx-auto px-4 py-4 flex gap-3">
                  <button
                    onClick={() => handleAnswer('yes', useOnboardingStore.getState().currentQuestion || undefined)}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleAnswer('no', useOnboardingStore.getState().currentQuestion || undefined)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    No
                  </button>
                </div>
              )}
              {/* Lead Type Buttons */}
              {useOnboardingStore.getState().currentQuestion === 'lead-type' && (
                <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3">
                  <button
                    onClick={() => handleAnswer('inbound', 'lead-type')}
                    className="w-full text-left px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <div className="font-semibold text-gray-900 mb-1">I have leads</div>
                    <div className="text-sm text-gray-600">Upload your Excel or CSV file</div>
                  </button>
                  <button
                    onClick={() => handleAnswer('outbound', 'lead-type')}
                    className="w-full text-left px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                  >
                    <div className="font-semibold text-gray-900 mb-1">Generate leads for me</div>
                    <div className="text-sm text-gray-600">We'll find leads based on your criteria</div>
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Bottom Input */}
        <div className="border-t border-gray-200 bg-white py-4 px-4">
          <ChatInputClaude
            onSend={handleSend}
            disabled={isProcessing}
            placeholder="Type your message..."
          />
        </div>
      </div>
      {/* RIGHT PANEL - WORKFLOW PREVIEW (40%) */}
      <div className="w-[40%] bg-gray-50">
        <WorkflowPreview />
      </div>
    </div>
  );
}