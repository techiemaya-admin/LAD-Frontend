'use client';
import React, { useState } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { 
  Linkedin, 
  Mail, 
  MessageSquare, 
  Phone, 
  Check, 
  ArrowRight,
  ArrowLeft,
  Instagram
} from 'lucide-react';
export default function Screen3WorkflowSetup() {
  const router = useRouter();
  const {
    channels,
    workflow,
    mainOption,
    setChannelConnection,
    setWorkflow,
    completeOnboarding,
    setCurrentScreen,
  } = useOnboardingStore();
  const [isSaving, setIsSaving] = useState(false);
  const handleConnect = async (channel: keyof typeof channels) => {
    // In a real app, this would open OAuth flow or connection modal
    // For now, just toggle the connection state
    setChannelConnection(channel, !channels[channel]);
    try {
      await apiPost('/api/onboarding/connect-channel', {
        channel,
        connected: !channels[channel],
      });
    } catch (error) {
      logger.error('Failed to connect channel', error);
    }
  };
  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      // Save workflow to backend
      await apiPost('/api/onboarding/save-workflow', {
        workflow: workflow || { nodes: [], edges: [] },
        channels,
        mainOption,
      });
      // Complete onboarding
      completeOnboarding();
      // Redirect to campaigns or dashboard
      setTimeout(() => {
        router.push('/campaigns');
      }, 1000);
    } catch (error) {
      logger.error('Failed to save workflow', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  const getBackScreen = () => {
    if (mainOption === 'automation') return 1;
    return 2; // For leads, go back to inbound/outbound selection
  };
  return (
    <div className="relative w-full h-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => setCurrentScreen(getBackScreen())}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Connect Your Channels
            </h1>
            <p className="text-xl text-gray-600">
              Connect the channels you want to use for your automation
            </p>
          </div>
          {/* Channel Connection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* LinkedIn */}
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent hover:border-blue-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Linkedin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">LinkedIn</h3>
                    <p className="text-sm text-gray-500">Connect your LinkedIn account</p>
                  </div>
                </div>
                {channels.linkedin && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleConnect('linkedin')}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  channels.linkedin
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {channels.linkedin ? 'Connected' : 'Connect LinkedIn'}
              </button>
            </div>
            {/* Email */}
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent hover:border-blue-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                    <p className="text-sm text-gray-500">Connect SMTP or OAuth</p>
                  </div>
                </div>
                {channels.email && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleConnect('email')}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  channels.email
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {channels.email ? 'Connected' : 'Connect Email'}
              </button>
            </div>
            {/* WhatsApp */}
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent hover:border-blue-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
                    <p className="text-sm text-gray-500">Connect WhatsApp Business API</p>
                  </div>
                </div>
                {channels.whatsapp && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleConnect('whatsapp')}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  channels.whatsapp
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {channels.whatsapp ? 'Connected' : 'Connect WhatsApp'}
              </button>
            </div>
            {/* Voice Agent */}
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent hover:border-blue-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Voice Agent</h3>
                    <p className="text-sm text-gray-500">Connect Twilio or voice service</p>
                  </div>
                </div>
                {channels.voiceAgent && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleConnect('voiceAgent')}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  channels.voiceAgent
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {channels.voiceAgent ? 'Connected' : 'Connect Voice Agent'}
              </button>
            </div>
            {/* Instagram (if automation suite) */}
            {mainOption === 'automation' && (
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent hover:border-blue-500 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Instagram className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
                      <p className="text-sm text-gray-500">Connect Instagram account</p>
                    </div>
                  </div>
                  {channels.instagram && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleConnect('instagram')}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    channels.instagram
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-pink-600 text-white hover:bg-pink-700'
                  }`}
                >
                  {channels.instagram ? 'Connected' : 'Connect Instagram'}
                </button>
              </div>
            )}
          </div>
          {/* Workflow Builder Placeholder */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Build Your Workflow
            </h2>
            <p className="text-gray-600 mb-6">
              {mainOption === 'automation'
                ? 'Set up your automation workflow with drag-and-drop steps'
                : 'Create your outreach workflow with LinkedIn, Email, WhatsApp, and Voice steps'}
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500 mb-4">
                Workflow builder will be available here
              </p>
              <p className="text-sm text-gray-400">
                You can build your workflow after connecting channels
              </p>
            </div>
          </div>
          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveWorkflow}
              disabled={isSaving || Object.values(channels).every((c) => !c)}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save Workflow & Complete Setup</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}