'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-utils';
interface WalletData {
  balance: number;
  currency: string;
  transactions: Transaction[];
}
interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  savings: number;
  popular?: boolean;
  description: string;
}
export const WalletBalance: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData>({
    balance: 0,
    currency: 'USD',
    transactions: []
  });
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    fetchWalletData();
    fetchCreditPackages();
  }, []);
  const fetchWalletData = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/wallet/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }
      const data = await response.json();
      // Transform backend response to wallet data
      setWallet({
        balance: data.balance || 0,
        currency: data.currency || 'credits',
        transactions: data.transactions || []
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      // Show zero balance on error
      setWallet({
        balance: 0,
        currency: 'credits',
        transactions: []
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchCreditPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/wallet/packages`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      if (!response.ok) {
        throw new Error('Failed to fetch credit packages');
      }
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      // Show empty packages on error
      setPackages([]);
    }
  };
  const handleRecharge = async (packageId: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/wallet/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          packageId,
          successUrl: `${window.location.origin}/wallet/success`,
          cancelUrl: `${window.location.origin}/wallet/cancel`,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create recharge session');
      }
      const { sessionUrl } = await response.json();
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Error processing recharge:', error);
      alert('Failed to process recharge. Please try again.');
    } finally {
      setProcessing(false);
      setShowRechargeModal(false);
    }
  };
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            <h2 className="text-2xl font-bold">Wallet Balance</h2>
          </div>
          <button
            onClick={() => setShowRechargeModal(true)}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Credits
          </button>
        </div>
        <div className="flex items-baseline">
          <span className="text-5xl font-bold">{wallet.balance.toLocaleString()}</span>
          <span className="text-xl ml-3 opacity-80">{wallet.currency}</span>
        </div>
        <p className="text-blue-100 mt-2">
          Available credits for voice calls, data scraping, and AI queries
        </p>
      </div>
      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Recharge Wallet</h3>
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                  setSelectedPackage(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8">
              <p className="text-gray-600 mb-6">
                Select a credit package to recharge your wallet
              </p>
              {/* Credit Packages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-blue-600 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    } ${pkg.popular ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          MOST POPULAR
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">{pkg.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-gray-900">${pkg.price}</span>
                        </div>
                        <div className="text-2xl font-semibold text-blue-600 mt-2">
                          {pkg.credits.toLocaleString()} credits
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          ${pkg.pricePerCredit.toFixed(3)} per credit
                        </div>
                      </div>
                      {pkg.savings > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                          <span className="text-green-700 font-semibold text-sm">
                            Save {pkg.savings}% vs Starter
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Selected Package Action */}
              {selectedPackage && (
                <button
                  onClick={() => handleRecharge(selectedPackage)}
                  disabled={processing}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Purchase {packages.find(p => p.id === selectedPackage)?.name} Package
                      <ArrowUpRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              )}
              <p className="text-xs text-gray-500 mt-4 text-center">
                Secure payment powered by Stripe. Credits never expire.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {wallet.transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No transactions yet
            </div>
          ) : (
            wallet.transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className={`rounded-full p-2 mr-4 ${
                      transaction.type === 'credit' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {transaction.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : transaction.status === 'pending' ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{transaction.status}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
