'use client';

import React from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import { Zap, Users } from 'lucide-react';

export default function Screen1OptionsInsideChat() {
  const { setSelectedPath, setHasSelectedOption, setIsAIChatActive, setCurrentScreen } = useOnboardingStore();

  const handleOptionSelect = (option: 'automation' | 'leads') => {
    setSelectedPath(option);
    setHasSelectedOption(true);
    setIsAIChatActive(true);
    setCurrentScreen(1); // Move to AI Chat screen
  };

  return (
    <div className="flex flex-col w-full h-full bg-white items-center justify-center">
      {/* Options and Chat Bar - Centered in middle of screen */}
      <div className="w-full max-w-6xl px-8 space-y-6">
        {/* Option Cards - Side by side, reduced size */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleOptionSelect('automation')}
            className="w-64 text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Automation Suite</h3>
                <p className="text-gray-600 text-xs">
                  Automate LinkedIn, Instagram, messaging, and voice interactions
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleOptionSelect('leads')}
            className="w-64 text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Lead Generation & Outreach</h3>
                <p className="text-gray-600 text-xs">
                  Find and engage with your ideal customers
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Chat Input Bar - Below options, wider */}
        <div className="w-full max-w-4xl mx-auto">
          <ChatInputClaude
            onSend={() => {}}
            disabled={true}
            placeholder="How can I help you today?"
          />
        </div>
      </div>
    </div>
  );
}

