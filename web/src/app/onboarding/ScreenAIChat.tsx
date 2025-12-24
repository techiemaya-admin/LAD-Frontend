'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import ChatMessageBubble from '@/components/onboarding/ChatMessageBubble';
import WorkflowPreview from '@/components/onboarding/WorkflowPreview';
import { Loader2, Bot, ArrowLeft } from 'lucide-react';
import { sendGeminiPrompt, routeMessageBasedOnState } from '@/services/geminiFlashService';
import { questionSequences } from '@/lib/onboardingQuestions';

export default function ScreenAIChat() {
  const {
    selectedPath,
    aiMessages,
    currentQuestionIndex,
    isProcessingAI,
    addAIMessage,
    setCurrentQuestionIndex,
    setIsProcessingAI,
    workflowPreview,
    addWorkflowStep,
    setWorkflowPreview,
    updateAutomationConfig,
    updateLeadConfig,
    setChannelConnection,
    setHasSelectedOption,
    setSelectedPath,
    setCurrentScreen,
  } = useOnboardingStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});

  // Scroll to bottom when messages update
  useEffect(() => {
    if (aiMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages]);

  // Start AI conversation when component mounts
  useEffect(() => {
    if (selectedPath && aiMessages.length === 0) {
      startAIConversation(selectedPath);
    }
  }, [selectedPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAIConversation = async (path: 'automation' | 'leads') => {
    setIsProcessingAI(true);
    
    // Get first question from sequence
    const firstQuestion = questionSequences[path][0];
    
    // Add AI greeting message
    addAIMessage({
      role: 'ai',
      content: firstQuestion.text,
      timestamp: new Date(),
      options: firstQuestion.options,
    });

    setIsProcessingAI(false);
  };

  const askNextQuestion = async () => {
    if (!selectedPath) return;

    const questions = questionSequences[selectedPath];
    let nextIndex = currentQuestionIndex + 1;

    // Skip questions that don't meet conditions
    while (nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex];
      
      if (nextQuestion.condition) {
        const shouldAsk = nextQuestion.condition(userAnswers);
        if (!shouldAsk) {
          nextIndex++;
          continue;
        }
      }
      break;
    }

    if (nextIndex < questions.length) {
      setIsProcessingAI(true);
      
      const nextQuestion = questions[nextIndex];

      setTimeout(() => {
        addAIMessage({
          role: 'ai',
          content: nextQuestion.text,
          timestamp: new Date(),
          options: nextQuestion.options,
        });
        setCurrentQuestionIndex(nextIndex);
        setIsProcessingAI(false);
      }, 500);
    } else {
      // All questions answered
      setIsProcessingAI(true);
      
      setTimeout(() => {
        addAIMessage({
          role: 'ai',
          content: 'Perfect! I\'ve set up your workflow. You can review it on the right and make any adjustments.',
          timestamp: new Date(),
        });
        setIsProcessingAI(false);
      }, 500);
    }
  };

  const handleAnswer = async (answer: string | string[], questionKey: string) => {
    // Add user message
    const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
    addAIMessage({
      role: 'user',
      content: answerText,
      timestamp: new Date(),
    });

    // Save answer
    const newAnswers = { ...userAnswers, [questionKey]: answer };
    setUserAnswers(newAnswers);

    // Update workflow based on answer
    updateWorkflowFromAnswer(questionKey, answer, selectedPath!);

    // Move to next question
    await askNextQuestion();
  };

  const updateWorkflowFromAnswer = (
    questionKey: string,
    answer: string | string[],
    path: 'automation' | 'leads'
  ) => {
    if (path === 'automation') {
      handleAutomationAnswer(questionKey, answer);
    } else {
      handleLeadAnswer(questionKey, answer);
    }
  };

  const handleAutomationAnswer = (questionKey: string, answer: string | string[]) => {
    if (questionKey === 'platforms') {
      const platforms = Array.isArray(answer) ? answer : [answer];
      updateAutomationConfig({ platforms });
      
      // Add workflow steps for selected platforms
      platforms.forEach((platform) => {
        if (platform.toLowerCase().includes('linkedin')) {
          addWorkflowStep({
            id: `step_${Date.now()}_linkedin`,
            type: 'linkedin_visit',
            title: 'LinkedIn Setup',
            channel: 'linkedin',
            icon: 'linkedin',
          });
          setChannelConnection('linkedin', true);
        }
        if (platform.toLowerCase().includes('instagram')) {
          addWorkflowStep({
            id: `step_${Date.now()}_instagram`,
            type: 'instagram_follow',
            title: 'Instagram Setup',
            channel: 'instagram',
            icon: 'instagram',
          });
          setChannelConnection('instagram', true);
        }
        if (platform.toLowerCase().includes('whatsapp')) {
          addWorkflowStep({
            id: `step_${Date.now()}_whatsapp`,
            type: 'whatsapp_send',
            title: 'WhatsApp Setup',
            channel: 'whatsapp',
            icon: 'whatsapp',
          });
          setChannelConnection('whatsapp', true);
        }
        if (platform.toLowerCase().includes('voice')) {
          addWorkflowStep({
            id: `step_${Date.now()}_voice`,
            type: 'voice_agent_call',
            title: 'Voice Agent Setup',
            channel: 'voice',
            icon: 'phone',
          });
          setChannelConnection('voiceAgent', true);
        }
      });
    }

    if (questionKey === 'automationTypes') {
      const types = Array.isArray(answer) ? answer : [answer];
      updateAutomationConfig({ automationTypes: types });
      
      // Add specific automation steps
      types.forEach((type) => {
        if (type.toLowerCase().includes('autopost')) {
          addWorkflowStep({
            id: `step_${Date.now()}_autopost`,
            type: 'linkedin_autopost',
            title: 'Auto Posting',
            channel: 'linkedin',
            icon: 'linkedin',
          });
        }
        if (type.toLowerCase().includes('comment')) {
          addWorkflowStep({
            id: `step_${Date.now()}_comment`,
            type: 'linkedin_comment_reply',
            title: 'Auto Commenting',
            channel: 'linkedin',
            icon: 'comment',
          });
        }
        if (type.toLowerCase().includes('message')) {
          addWorkflowStep({
            id: `step_${Date.now()}_message`,
            type: 'linkedin_message',
            title: 'Auto Messaging',
            channel: 'linkedin',
            icon: 'message',
          });
        }
      });
    }

    if (questionKey === 'frequency') {
      updateAutomationConfig({ frequency: answer as string });
    }

    if (questionKey === 'conditionalActions') {
      updateAutomationConfig({ conditionalActions: answer === 'yes' || answer === true });
      if (answer === 'yes' || answer === true) {
        addWorkflowStep({
          id: `step_${Date.now()}_condition`,
          type: 'condition',
          title: 'Conditional Actions',
          icon: 'condition',
        });
      }
    }
  };

  const handleLeadAnswer = (questionKey: string, answer: string | string[]) => {
    if (questionKey === 'leadType') {
      const isInbound = answer === 'inbound' || (answer as string).toLowerCase().includes('inbound');
      updateLeadConfig({ leadType: isInbound ? 'inbound' : 'outbound' });
    }

    if (questionKey === 'outreachChannels') {
      const channels = Array.isArray(answer) ? answer : [answer];
      updateLeadConfig({ outreachChannels: channels });
      
      // Build outreach workflow
      const steps = [];
      if (channels.some((c) => c.toLowerCase().includes('linkedin'))) {
        steps.push({
          id: 'step_linkedin_visit',
          type: 'linkedin_visit',
          title: 'Visit LinkedIn Profile',
          channel: 'linkedin',
          icon: 'linkedin',
        });
        steps.push({
          id: 'step_linkedin_connect',
          type: 'linkedin_connect',
          title: 'Send Connection Request',
          channel: 'linkedin',
          icon: 'linkedin',
        });
        setChannelConnection('linkedin', true);
      }
      if (channels.some((c) => c.toLowerCase().includes('email'))) {
        steps.push({
          id: 'step_email',
          type: 'email_send',
          title: 'Send Email',
          channel: 'email',
          icon: 'email',
        });
        setChannelConnection('email', true);
      }
      if (channels.some((c) => c.toLowerCase().includes('whatsapp'))) {
        steps.push({
          id: 'step_whatsapp',
          type: 'whatsapp_send',
          title: 'Send WhatsApp Message',
          channel: 'whatsapp',
          icon: 'whatsapp',
        });
        setChannelConnection('whatsapp', true);
      }
      
      setWorkflowPreview(steps);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isProcessingAI) return;

    const currentQuestion = questionSequences[selectedPath!]?.[currentQuestionIndex];
    if (currentQuestion) {
      await handleAnswer(message, currentQuestion.key);
    }
  };

  const currentQuestion = selectedPath ? questionSequences[selectedPath]?.[currentQuestionIndex] : null;

  const handleBack = () => {
    setHasSelectedOption(false);
    setSelectedPath(null);
    setCurrentScreen(0);
    // Clear AI messages to reset the flow
    useOnboardingStore.setState({ aiMessages: [], currentQuestionIndex: 0 });
  };

  return (
    <div className="flex w-full h-screen bg-white">
      {/* LEFT PANEL - CHAT (60%) */}
      <div className="w-[60%] border-r border-gray-200 flex flex-col">
        {/* Back Button */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to options</span>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-8">
            {aiMessages.map((message, index) => (
              <ChatMessageBubble
                key={index}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}

            {isProcessingAI && (
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

            {/* Option Buttons for current question */}
            {currentQuestion?.options && !isProcessingAI && (
              <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value, currentQuestion.key)}
                    className="w-full text-left px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input */}
        <div className="border-t border-gray-200 bg-white py-4 px-4">
          <ChatInputClaude
            onSend={handleSend}
            disabled={isProcessingAI || (currentQuestion?.options && currentQuestion.options.length > 0)}
            placeholder={
              currentQuestion?.options && currentQuestion.options.length > 0
                ? 'Select an option above...'
                : 'Type your answer...'
            }
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

