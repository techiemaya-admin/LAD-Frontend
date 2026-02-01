'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, Plus, X, Loader2 } from 'lucide-react';
import { useCreditsBalance, useStripeCheckout } from '@/features/billing';
import { logger } from '@/lib/logger';
import { safeStorage } from '@/utils/storage';
export const CreditsSettings: React.FC = () => {
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // SDK hooks for wallet and payment
  const { data: creditsData, isLoading: isLoadingBalance } = useCreditsBalance();
  const { mutate: createCheckout, isPending: isProcessing } = useStripeCheckout();

  const presetAmounts = [
    { value: 99, credits: 1000, label: 'Starter' },
    { value: 199, credits: 3000, label: 'Professional' },
    { value: 499, credits: 12000, label: 'Business' },
    { value: 999, credits: 12000, label: 'Enterprise' },
  ];

  // Extract balance from SDK response  
  const balance = creditsData?.availableBalance ?? creditsData?.currentBalance ?? 0;
  const lastUpdated = 'Just now';
  const handleProceedToPayment = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount <= 0) {
      alert('Please select or enter a valid amount');
      return;
    }

    try {
      const token = safeStorage.getItem('token');
      if (!token) {
        alert('Please log in to proceed with payment');
        return;
      }

      // Call SDK hook to create Stripe checkout session
      createCheckout({
        amount,
        successUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/settings?tab=credits&payment=success`,
        cancelUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/settings?tab=credits&payment=cancelled`,
        metadata: {
          credits: amount,
        },
      });
    } catch (error) {
      logger.error('Error processing payment', { error: error instanceof Error ? error.message : 'Unknown error' });
      alert(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(''); // Clear custom amount when preset is selected
  };
  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null); // Clear preset selection when custom amount is entered
  };

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
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-lg shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Wallet className="h-6 w-6 mr-3" />
            <h3 className="text-xl font-bold">Wallet Balance</h3>
          </div>
          <button
            onClick={() => setShowAddCreditsModal(true)}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Credits
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">Available Credits</p>
            {isLoadingBalance ? (
              <div className="flex items-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : (
              <p className="text-4xl font-bold">{balance.toLocaleString()}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-xs">Last updated</p>
            <p className="text-white text-sm font-medium">{lastUpdated}</p>
          </div>
        </div>
      </div>
      {/* Add Credits Modal */}
      {showAddCreditsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddCreditsModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Credits</h3>
              <button
                onClick={() => setShowAddCreditsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectAmount(preset.value)}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      selectedAmount === preset.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <p className="text-2xl font-bold text-blue-600">{preset.credits.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">credits</p>
                    <p className="text-sm text-gray-700 mt-1 font-medium">${preset.value}</p>
                    <p className="text-xs text-gray-500">{preset.label}</p>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    customAmount ? 'border-blue-600' : 'border-gray-300'
                  }`}
                  min="1"
                />
              </div>
              {(selectedAmount || customAmount) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">You'll receive: </span>
                    {(() => {
                      const amount = parseFloat(customAmount) || selectedAmount || 0;
                      if (!amount || amount <= 0) return 'Select an amount';
                      const preset = presetAmounts.find(p => p.value === amount);
                      const credits = preset ? preset.credits : Math.round(amount * 10.1); // Approximate for custom amounts
                      return `${credits.toLocaleString()} credits for $${amount}`;
                    })()}
                  </p>
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddCreditsModal(false);
                    setSelectedAmount(null);
                    setCustomAmount('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToPayment}
                  disabled={(!selectedAmount && !customAmount) || isProcessing}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                    (selectedAmount || customAmount) && !isProcessing
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Credits Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">How Credits Work</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Purchase Credits</h4>
              <p className="text-sm text-gray-600">
                Add credits to your wallet at any time. Credits never expire and can be used across all services.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Use for Services</h4>
              <p className="text-sm text-gray-600">
                Credits are automatically deducted when you use services like voice calls, SMS messages, and lead generation.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Track Usage</h4>
              <p className="text-sm text-gray-600">
                Monitor your credit usage and remaining balance in real-time from your wallet dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Credit Pricing Guide */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Credit Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Voice Calls (Cartesia)</span>
              <span className="text-blue-600 font-semibold">3 cr/min</span>
            </div>
            <p className="text-xs text-gray-600">Per minute (includes analytics)</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Premium Voice (ElevenLabs)</span>
              <span className="text-blue-600 font-semibold">4 cr/min</span>
            </div>
            <p className="text-xs text-gray-600">Higher quality voice + analytics</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Email + Linkedin URL</span>
              <span className="text-blue-600 font-semibold">2 credits</span>
            </div>
            <p className="text-xs text-gray-600">Per lead with email address and Linkedin Profile URL</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Phone Reveal</span>
              <span className="text-blue-600 font-semibold">10 credits</span>
            </div>
            <p className="text-xs text-gray-600">Per phone number revealed</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Profile Summary</span>
              <span className="text-blue-600 font-semibold">5 credits</span>
            </div>
            <p className="text-xs text-gray-600">AI-generated profile summary</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">LinkedIn Connection</span>
              <span className="text-blue-600 font-semibold">50 cr/mo</span>
            </div>
            <p className="text-xs text-gray-600">Monthly connection fee</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Google Connection</span>
              <span className="text-blue-600 font-semibold">20 cr/mo</span>
            </div>
            <p className="text-xs text-gray-600">Monthly connection fee</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Outlook Connection</span>
              <span className="text-blue-600 font-semibold">20 cr/mo</span>
            </div>
            <p className="text-xs text-gray-600">Monthly connection fee</p>
          </div>
        </div>
      </div>
    </div>
  );
};
