'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Loader2 } from 'lucide-react';
import { useCreditsBalance } from '@lad/frontend-features/billing';
import { AddCreditsModal } from '@/components/billing/AddCreditsModal';

export const CreditsSettings: React.FC = () => {
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);

  // SDK hook for wallet balance. Package selection and checkout now live in
  // the shared AddCreditsModal, which reads packages from the backend.
  const { data: creditsData, isLoading: isLoadingBalance } = useCreditsBalance();

  // Extract balance from SDK response
  const balance = creditsData?.availableBalance ?? creditsData?.currentBalance ?? 0;
  const lastUpdated = 'Just now';

  // Check URL parameters to auto-open Add Credits modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') {
        setShowAddCreditsModal(true);
        // Clean URL after opening modal
        window.history.replaceState({}, '', window.location.pathname + '?tab=credits');
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-[#ffffff] p-6 rounded-xl shadow-lg dark:from-[#051139] dark:to-[#02081e] dark:border dark:border-blue-950/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Wallet className="h-5 w-5 mr-2 text-[#ffffff] dark:text-blue-400" />
            <h3 className="text-lg font-bold text-[#ffffff]">Wallet Balance</h3>
          </div>
          <button
            onClick={() => setShowAddCreditsModal(true)}
            className="bg-white/10 hover:bg-white/20 text-[#ffffff] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Credits
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 dark:text-gray-400 text-sm mb-1">Available Credits</p>
            {isLoadingBalance ? (
              <div className="flex items-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : (
              <p className="text-4xl font-bold dark:text-white">{balance.toLocaleString()}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-blue-100 dark:text-gray-500 text-xs">Last updated</p>
            <p className="text-white dark:text-gray-300 text-sm font-medium">{lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Add Credits Modal — shared popup used by every credit CTA. */}
      <AddCreditsModal open={showAddCreditsModal} onClose={() => setShowAddCreditsModal(false)} />

      {/* Credits Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 dark:bg-[#030a21]/60 dark:border-blue-950/40">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">How Credits Work</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Purchase Credits</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add credits to your wallet at any time. Credits are valid for 1 month and can be used across all services.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Use for Services</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Credits are automatically deducted when you use services like voice calls, SMS messages, and lead generation.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Track Usage</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor your credit usage and remaining balance in real-time from your wallet dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Pricing Guide */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 dark:bg-[#030a21]/60 dark:border-blue-950/40">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Credit Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Voice Calls (Cartesia)</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">3 cr/min</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Per minute (includes analytics)</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Premium Voice (ElevenLabs)</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">4 cr/min</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Higher quality voice + analytics</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Email + Linkedin URL</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">2 credits</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Per lead with email address and Linkedin Profile URL</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Phone Reveal</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">10 credits</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Per phone number revealed</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Profile Summary</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">5 credits</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">AI-generated profile summary</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">LinkedIn Connection</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">50 cr/mo</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Monthly connection fee</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Google Connection</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">20 cr/mo</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Monthly connection fee</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-blue-950/40 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Outlook Connection</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">20 cr/mo</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Monthly connection fee</p>
          </div>
        </div>
      </div>
    </div>
  );
};
