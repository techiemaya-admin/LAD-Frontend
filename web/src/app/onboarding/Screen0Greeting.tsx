'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import ChatMessageBubble from '@/components/onboarding/ChatMessageBubble';
import { Loader2, Bot } from 'lucide-react';
export default function Screen0Greeting() {
  const {
    chatHistory,
    hasStartedGreeting,
    addChatMessage,
    setHasStartedGreeting,
    setCurrentScreen,
  } = useOnboardingStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('there');
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
  const handleSend = async (message: string) => {
    if (!message.trim() || isProcessing) return;
    // If this is the first message, start the greeting flow
    if (!hasStartedGreeting && chatHistory.length === 0) {
      addChatMessage('user', message);
      setHasStartedGreeting(true);
      setIsProcessing(true);
      setTimeout(() => {
        addChatMessage('ai', `Hey ${userName}! 👋\n\nI'm here to help you set up your automation workflow. Let's get started!`);
        setIsProcessing(false);
        // After greeting, move to main options screen
        setTimeout(() => {
          setCurrentScreen(1);
        }, 1500);
      }, 1000);
      return;
    }
  };
  const handleGetStarted = () => {
    if (hasStartedGreeting) return;
    handleSend('Get Started');
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
              {/* Get Started Button */}
              <button
                onClick={handleGetStarted}
                className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Get Started
              </button>
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
              placeholder="Type your message..."
            />
          </div>
        </>
      )}
    </div>
  );
}