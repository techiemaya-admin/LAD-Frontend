'use client';

import React from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import { 
  Zap, 
  Users, 
  Linkedin, 
  Instagram, 
  MessageSquare, 
  Reply, 
  Send, 
  Phone, 
  Search, 
  FileText, 
  Mail,
  ArrowRight
} from 'lucide-react';

export default function Screen1MainOptions() {
  const { setMainOption, setCurrentScreen } = useOnboardingStore();

  const handleSelect = async (option: 'automation' | 'leads') => {
    setMainOption(option);
    
    try {
      await apiPost('/api/onboarding/select-main-option', { option });
    } catch (error) {
      console.error('Failed to save main option:', error);
    }

    if (option === 'automation') {
      // Skip to workflow setup for automation
      setCurrentScreen(5);
    } else {
      // Go to lead type selection
      setCurrentScreen(2);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Path
            </h1>
            <p className="text-xl text-gray-600">
              Select the solution that best fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Option A - Automation Suite */}
            <div
              onClick={() => handleSelect('automation')}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Automation Suite</h2>
                  <p className="text-gray-500">Automate your social media and messaging</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <Linkedin className="w-5 h-5 text-blue-600" />
                  <span>LinkedIn autoposting</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Instagram className="w-5 h-5 text-pink-600" />
                  <span>Instagram autoposting</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span>Auto-commenting</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Reply className="w-5 h-5 text-orange-600" />
                  <span>Auto-comment replies</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Send className="w-5 h-5 text-indigo-600" />
                  <span>Auto-messaging</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <span>WhatsApp automation</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-5 h-5 text-red-600" />
                  <span>Voice agent for automation calls</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-4 transition-all">
                <span>Select this option</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Option B - Lead Generation & Outreach */}
            <div
              onClick={() => handleSelect('leads')}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Lead Generation & Outreach</h2>
                  <p className="text-gray-500">Find and engage with your ideal customers</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <Search className="w-5 h-5 text-blue-600" />
                  <span>Lead scraping</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>Lead generation (Apollo-style)</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span>Lead import</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Linkedin className="w-5 h-5 text-blue-600" />
                  <span>Outreach via LinkedIn, Email, WhatsApp</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-5 h-5 text-red-600" />
                  <span>Voice agent for calls</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-green-600 font-semibold group-hover:gap-4 transition-all">
                <span>Select this option</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

