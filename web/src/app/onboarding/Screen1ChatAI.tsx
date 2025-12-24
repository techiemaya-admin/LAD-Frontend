'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import ChatMessageBubble from '@/components/onboarding/ChatMessageBubble';
import { Loader2, Bot } from 'lucide-react';

const QUESTIONS = [
  {
    id: 'channels',
    question: 'Which automation channels do you want to use? LinkedIn, Email, WhatsApp, Instagram, or Voice Agent?',
    type: 'multi-select',
    options: ['LinkedIn', 'Email', 'WhatsApp', 'Instagram', 'Voice Agent'],
    key: 'channels',
  },
  {
    id: 'targetAudience',
    question: 'Who is your target audience?',
    type: 'text',
    placeholder: 'e.g., B2B SaaS founders, Marketing directors, etc.',
    key: 'targetAudience',
  },
  {
    id: 'outcome',
    question: 'What outcome do you want? Book calls, increase replies, nurture leads, or automate posting?',
    type: 'select',
    options: ['Book calls', 'Increase replies', 'Nurture leads', 'Automate posting'],
    key: 'outcome',
  },
  {
    id: 'fallback',
    question: 'Do you want fallback logic? For example, send Email after LinkedIn, or WhatsApp after Email?',
    type: 'boolean',
    key: 'fallbackLogic',
  },
  {
    id: 'features',
    question: 'Do you want autoposting, DM automation, or comment replies?',
    type: 'multi-select',
    options: ['Autoposting', 'DM Automation', 'Comment Replies'],
    key: 'features',
  },
];

export default function Screen1ChatAI() {
  const {
    answers,
    chatHistory,
    currentQuestionIndex,
    addChatMessage,
    updateAnswers,
    setCurrentQuestionIndex,
    setCurrentScreen,
  } = useOnboardingStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('there');

  // Get user name on mount - but don't start chat
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

  // Only scroll when messages exist
  useEffect(() => {
    if (chatHistory.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const startOnboardingFlow = () => {
    if (hasStarted) return;
    
    setHasStarted(true);
    
    // Start with greeting and first question
    setTimeout(() => {
      addChatMessage('ai', `Hey there, ${userName}! 👋\n\nI'm here to help you set up your automation workflow. Let me ask you a few questions to get started.`);
      
      setTimeout(() => {
        askQuestion(0);
      }, 1000);
    }, 500);
  };

  const askQuestion = (index: number) => {
    if (index >= QUESTIONS.length) {
      addChatMessage('ai', 'Perfect! I have all the information I need. I\'ll now generate your automation workflow based on your preferences.');
      setTimeout(() => {
        setCurrentScreen(2);
      }, 2000);
      return;
    }

    const question = QUESTIONS[index];
    let questionText = question.question;

    if (question.type === 'multi-select') {
      questionText += '\n\nYou can select multiple options: ' + question.options.join(', ');
    } else if (question.type === 'select') {
      questionText += '\n\nOptions: ' + question.options.join(', ');
    }

    addChatMessage('ai', questionText);
  };

  const handleAnswer = async (answer: string | string[] | boolean) => {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsProcessing(true);

    // Add user message
    let userMessage = '';
    if (Array.isArray(answer)) {
      userMessage = answer.join(', ');
    } else if (typeof answer === 'boolean') {
      userMessage = answer ? 'Yes' : 'No';
    } else {
      userMessage = answer;
    }
    addChatMessage('user', userMessage);

    // Update answers
    const updates: any = {};
    if (currentQuestion.key === 'fallbackLogic') {
      updates.fallbackLogic = {
        enabled: answer as boolean,
        rules: [],
      };
    } else if (currentQuestion.key === 'features') {
      const features = answer as string[];
      updates.autoposting = features.includes('Autoposting');
      updates.dmAutomation = features.includes('DM Automation');
      updates.commentReplies = features.includes('Comment Replies');
    } else {
      updates[currentQuestion.key] = answer;
    }
    updateAnswers(updates);

    // Save to backend
    try {
      await apiPost('/api/onboarding/answers', {
        questionId: currentQuestion.id,
        answer: answer,
        answers: { ...answers, ...updates },
      });
    } catch (error) {
      console.error('Failed to save answers:', error);
    }

    setIsProcessing(false);

    // Move to next question
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setTimeout(() => {
      askQuestion(nextIndex);
    }, 500);
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    // If this is the first message, start the onboarding flow
    if (!hasStarted && chatHistory.length === 0) {
      // Add user's first message
      addChatMessage('user', message);
      
      // Start onboarding flow
      startOnboardingFlow();
      return;
    }

    // If we're past all questions, check for workflow generation command
    if (currentQuestionIndex >= QUESTIONS.length) {
      if (message.toLowerCase().includes('generate') || message.toLowerCase().includes('create') || message.toLowerCase().includes('workflow')) {
        setCurrentScreen(2);
        return;
      }
      addChatMessage('ai', 'I\'ve collected all the information I need. I\'ll now generate your workflow!');
      setTimeout(() => {
        setCurrentScreen(2);
      }, 1500);
      return;
    }

    // Handle answer based on question type
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    if (currentQuestion) {
      if (currentQuestion.type === 'multi-select') {
        // Parse comma-separated values
        const selected = message
          .split(',')
          .map((s) => s.trim())
          .filter((s) => currentQuestion.options?.includes(s));
        if (selected.length > 0) {
          handleAnswer(selected);
        } else {
          addChatMessage('ai', `Please select from: ${currentQuestion.options?.join(', ')}`);
        }
      } else if (currentQuestion.type === 'select') {
        const selected = currentQuestion.options?.find(
          (opt) => opt.toLowerCase() === message.toLowerCase()
        );
        if (selected) {
          handleAnswer(selected);
        } else {
          addChatMessage('ai', `Please choose one: ${currentQuestion.options?.join(', ')}`);
        }
      } else if (currentQuestion.type === 'boolean') {
        const isYes = ['yes', 'y', 'true', 'sure', 'ok', 'okay'].includes(message.toLowerCase());
        handleAnswer(isYes);
      } else {
        // Text input
        handleAnswer(message);
      }
    }
  };

  const hasMessages = chatHistory.length > 0;

  return (
    <div className="relative w-full h-screen bg-white flex flex-col overflow-hidden">
      {!hasMessages && (
        <>
          {/* Centered Greeting and Input Container */}
          <div className="flex flex-col justify-center items-center h-full w-full">
            <div className="flex flex-col items-center justify-center w-full max-w-3xl px-4">
              {/* Greeting */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-gray-900">
                  Hey there, {userName} 👋
                </h1>
              </div>

              {/* Centered Input - Directly below greeting */}
              <div className="w-full max-w-3xl">
                <ChatInputClaude
                  onSend={handleSend}
                  disabled={isProcessing}
                  placeholder="How can I help you today?"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {hasMessages && (
        <>
          {/* Chat Messages - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 pb-24">
            <div className="max-w-3xl mx-auto">
              {chatHistory.map((message, index) => (
                <ChatMessageBubble
                  key={index}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}

              {isProcessing && (
                <div className="flex gap-4 w-full px-4 py-6 bg-white">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400 text-sm">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Input - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 w-full px-6 pb-4 bg-white border-t border-gray-200 pt-4">
            <ChatInputClaude
              onSend={handleSend}
              disabled={isProcessing}
              placeholder={
                currentQuestionIndex >= QUESTIONS.length
                  ? 'Type "generate" to create your workflow...'
                  : QUESTIONS[currentQuestionIndex]?.type === 'text'
                  ? QUESTIONS[currentQuestionIndex].placeholder || 'Type your answer...'
                  : 'Type your response...'
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
