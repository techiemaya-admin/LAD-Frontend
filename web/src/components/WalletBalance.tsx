'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, Clock, CheckCircle2, Repeat, RefreshCw, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-utils';
import {
  getCreditPackages,
  getWalletBalance,
  getWalletBalanceLegacy,
  rechargeWallet,
  subscribeMonthly,
  setupAutoRecharge,
  getRecurring,
  cancelRecurring,
  type RecurringStatus,
} from '@lad/frontend-features/billing';

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
  const [purchaseMode, setPurchaseMode] = useState<'one_time' | 'monthly' | 'auto_recharge'>('one_time');
  const [threshold, setThreshold] = useState<number>(250);
  const [recurring, setRecurring] = useState<RecurringStatus | null>(null);
  const [cancellingKind, setCancellingKind] = useState<'monthly' | 'auto_recharge' | null>(null);
  useEffect(() => {
    fetchWalletData();
    fetchCreditPackages();
    fetchRecurring();
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
  const fetchRecurring = async () => {
    try {
      setRecurring(await getRecurring());
    } catch (error) {
      console.error('Error fetching recurring billing:', error);
      setRecurring(null);
    }
  };
  const handleSubscribe = async (packageId: string) => {
    setProcessing(true);
    try {
      const { sessionUrl } = await subscribeMonthly({
        packageId,
        successUrl: `${window.location.origin}/wallet/success`,
        cancelUrl: `${window.location.origin}/wallet/cancel`,
      });
      window.location.href = sessionUrl;
    } catch (error: any) {
      console.error('Error starting subscription:', error);
      alert(error?.message || 'Failed to start subscription. Please try again.');
    } finally {
      setProcessing(false);
      setShowRechargeModal(false);
    }
  };
  const handleAutoRecharge = async (packageId: string) => {
    setProcessing(true);
    try {
      const { sessionUrl } = await setupAutoRecharge({
        packageId,
        thresholdCredits: threshold,
        successUrl: `${window.location.origin}/wallet/success`,
        cancelUrl: `${window.location.origin}/wallet/cancel`,
      });
      window.location.href = sessionUrl;
    } catch (error: any) {
      console.error('Error enabling auto-recharge:', error);
      alert(error?.message || 'Failed to enable auto-recharge. Please try again.');
    } finally {
      setProcessing(false);
      setShowRechargeModal(false);
    }
  };
  const handleConfirmPurchase = (packageId: string) => {
    if (purchaseMode === 'monthly') return handleSubscribe(packageId);
    if (purchaseMode === 'auto_recharge') return handleAutoRecharge(packageId);
    return handleRecharge(packageId);
  };
  const handleCancelRecurring = async (kind: 'monthly' | 'auto_recharge') => {
    setCancellingKind(kind);
    try {
      await cancelRecurring(kind);
      await fetchRecurring();
    } catch (error) {
      console.error('Error cancelling recurring:', error);
      alert('Failed to cancel. Please try again.');
    } finally {
      setCancellingKind(null);
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
      {/* Recurring billing status */}
      {(recurring?.monthly || recurring?.autoRecharge) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {recurring?.monthly && recurring.monthly.status !== 'canceled' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Monthly subscription</h4>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${recurring.monthly.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {recurring.monthly.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {recurring.monthly.credits.toLocaleString()} credits / month · ${recurring.monthly.priceUsd}
              </p>
              {recurring.monthly.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Next charge: {formatDate(recurring.monthly.currentPeriodEnd)}
                </p>
              )}
              <button
                onClick={() => handleCancelRecurring('monthly')}
                disabled={cancellingKind === 'monthly'}
                className="mt-3 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {cancellingKind === 'monthly' ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            </div>
          )}
          {recurring?.autoRecharge && recurring.autoRecharge.status !== 'canceled' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Auto-recharge</h4>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${recurring.autoRecharge.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {recurring.autoRecharge.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                +{recurring.autoRecharge.credits.toLocaleString()} credits when balance &lt; {recurring.autoRecharge.thresholdCredits?.toLocaleString()} credits
              </p>
              {recurring.autoRecharge.lastError && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {recurring.autoRecharge.lastError}
                </p>
              )}
              <button
                onClick={() => handleCancelRecurring('auto_recharge')}
                disabled={cancellingKind === 'auto_recharge'}
                className="mt-3 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {cancellingKind === 'auto_recharge' ? 'Disabling…' : 'Disable auto-recharge'}
              </button>
            </div>
          )}
        </div>
      )}
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

            {/* Mode toggle + Package Cards */}
            <div className="p-4">
              {/* Purchase mode */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-1 bg-muted rounded-xl">
                {([
                  { key: 'one_time', label: 'One-time' },
                  { key: 'monthly', label: 'Monthly' },
                  { key: 'auto_recharge', label: 'Auto-recharge' },
                ] as const).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPurchaseMode(m.key)}
                    className={`text-xs font-semibold py-2 rounded-lg transition-all ${purchaseMode === m.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {purchaseMode === 'auto_recharge' && (
                <div className="mb-4 rounded-xl border border-border bg-accent/30 p-3">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Recharge when my balance falls below
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={1}
                      value={threshold}
                      onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value || '0', 10)))}
                      className="w-28 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">credits</span>
                  </div>
                </div>
              )}
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
                onClick={() => selectedPackage && handleConfirmPurchase(selectedPackage)}
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
                    {(() => {
                      const pkg = packages.find(p => p.id === selectedPackage);
                      if (!pkg) return 'Continue';
                      if (purchaseMode === 'monthly') return `Subscribe ${pkg.name} - $${pkg.price}/mo`;
                      if (purchaseMode === 'auto_recharge') return `Enable auto-recharge - $${pkg.price} per top-up`;
                      return `Purchase ${pkg.name} - $${pkg.price}`;
                    })()}
                    <ArrowUpRight className="h-4 w-4 ml-1.5" />
                  </>
                ) : (
                  'Select a package'
                )}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                {purchaseMode === 'monthly'
                  ? 'Billed monthly via Stripe until you cancel. Credits added each cycle.'
                  : purchaseMode === 'auto_recharge'
                  ? 'We securely save your card and top up automatically when you run low.'
                  : 'Secure payment powered by Stripe. Credits valid for 1 month.'}
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
