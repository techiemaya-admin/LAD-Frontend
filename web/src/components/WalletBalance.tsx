'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-utils';
import { getCreditPackages, getWalletBalance, getWalletBalanceLegacy } from '@lad/frontend-features/billing';
import { rechargeWallet } from '../../../sdk/features/billing/api';
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

      const responseWallet = await getWalletBalance()
      if (!responseWallet.walletId) {
        const legacyData = await getWalletBalanceLegacy()
        setWallet({
          balance: legacyData.balance || 0,
          currency: legacyData.currency || 'USD',
          transactions: legacyData.transactions || []
        });
        return;
      }
      // Transform new API response to wallet data
      setWallet({
        balance: responseWallet?.availableBalance || responseWallet?.currentBalance || responseWallet.balance || 0,
        currency: responseWallet?.currency || responseWallet.currency || 'USD',
        transactions: responseWallet.transactions || []
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setWallet({
        balance: 0,
        currency: 'USD',
        transactions: []
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchCreditPackages = async () => {
    try {
      const packageData = await getCreditPackages()
      setPackages(packageData || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    }
  };
  const handleRecharge = async (packageId: string) => {
    setProcessing(true);
    try {
      const { sessionUrl } = await rechargeWallet({
        packageId,
        successUrl: `${window.location.origin}/wallet/success`,
        cancelUrl: `${window.location.origin}/wallet/cancel`,
      });
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground shadow-xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            <h2 className="text-2xl font-bold">Wallet Balance</h2>
          </div>
          <button
            onClick={() => setShowRechargeModal(true)}
            className="bg-white text-primary px-6 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Credits
          </button>
        </div>
        <div className="flex items-baseline">
          <span className="text-5xl font-bold">{wallet.balance.toLocaleString()}</span>
          <span className="text-xl ml-3 opacity-80">{wallet.currency}</span>
        </div>
        <p className="text-primary-foreground/70 mt-2">
          Available credits for voice calls, data scraping, and AI queries
        </p>
      </div>
      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowRechargeModal(false); setSelectedPackage(null); }}>
          <div className="bg-card text-card-foreground rounded-2xl max-w-2xl w-full border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Recharge Wallet</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select a credit package</p>
              </div>
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                  setSelectedPackage(null);
                }}
                className="text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Package Cards - 2x2 grid, compact */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${selectedPackage === pkg.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:bg-accent/30'
                      } ${pkg.popular ? 'ring-2 ring-primary/30' : ''}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          MOST POPULAR
                        </span>
                      </div>
                    )}
                    <h4 className="text-sm font-bold text-foreground">{pkg.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{pkg.description}</p>
                    <p className="text-2xl font-bold text-foreground mt-2">${pkg.price}</p>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {pkg.credits.toLocaleString()} credits
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ${pkg.pricePerCredit.toFixed(3)} per credit
                    </p>
                    {pkg.savings > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-md px-2 py-1 text-center mt-2">
                        <span className="text-green-700 font-semibold text-[11px]">
                          Save {pkg.savings}% vs Starter
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border space-y-2">
              <button
                onClick={() => selectedPackage && handleRecharge(selectedPackage)}
                disabled={!selectedPackage || processing}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Processing...
                  </>
                ) : selectedPackage ? (
                  <>
                    Purchase {packages.find(p => p.id === selectedPackage)?.name} - ${packages.find(p => p.id === selectedPackage)?.price}
                    <ArrowUpRight className="h-4 w-4 ml-1.5" />
                  </>
                ) : (
                  'Select a package'
                )}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Secure payment powered by Stripe. Credits never expire.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Transaction History */}
      <div className="bg-card text-card-foreground rounded-xl shadow-md overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
        </div>
        <div className="divide-y divide-border">
          {wallet.transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            wallet.transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className={`rounded-full p-2 mr-4 ${transaction.type === 'credit'
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
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(transaction.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                      {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
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
