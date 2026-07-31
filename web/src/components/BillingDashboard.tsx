'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Calendar, Download, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { CreditUsageAnalytics } from './CreditUsageAnalytics';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api-utils';
import { getCreditsBalance, getCreditsBalanceLegacy } from '@lad/frontend-features/billing';
interface CreditBalance {
  credits: number;
  lastRecharge: {
    amount: number;
    credits: number;
    date: string;
  } | null;
  monthlyUsage: number;
  totalSpent: number;
}
interface BillingDashboardProps {
  customerId?: string;
}
/**
 * Every credit-purchase CTA on this dashboard points here. CreditsSettings
 * reads action=add on mount, opens its Add Credits modal, then strips the
 * param back to ?tab=credits. Same target the pricing page CTA uses.
 */
const ADD_CREDITS_HREF = '/settings?tab=credits&action=add';
export const BillingDashboard: React.FC<BillingDashboardProps> = ({ customerId }) => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchCreditBalance();
  }, []);
  const fetchCreditBalance = async () => {
    try {
      const walletData = await getCreditsBalance();

      setBalance({
        credits: walletData.availableBalance || walletData.currentBalance || 0,
        lastRecharge: null,
        monthlyUsage: 0,
        totalSpent: 0
      });

    } catch (err) {
      // Fallback to legacy endpoint
      try {
        const legacyData = await getCreditsBalanceLegacy();
        setBalance({
          credits: legacyData.credits || legacyData.balance || 0,
          lastRecharge: legacyData.lastRecharge || null,
          monthlyUsage: legacyData.monthlyUsage || 0,
          totalSpent: legacyData.totalSpent || 0
        });
      } catch (legacyErr) {
        console.error('Error fetching credit balance:', legacyErr);
        setBalance({
          credits: 0,
          lastRecharge: null,
          monthlyUsage: 0,
          totalSpent: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  if (loading) {
    return (
      <LoadingSpinner size="md" message="Loading billing information..." />
    );
  }
  if (error) {
    return (
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg border border-border dark:bg-[#030a21]/60 dark:border-blue-950/40">
        <div className="text-center text-destructive mb-4">
          <Wallet className="h-8 w-8 mx-auto mb-2" />
          <span className="text-lg font-medium">Unable to Load Billing Information</span>
        </div>
        <p className="text-muted-foreground text-center">{error}</p>
      </div>
    );
  }
  if (!balance) {
    return (
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg border border-border dark:bg-[#030a21]/60 dark:border-blue-950/40">
        <div className="text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Credit Balance</h3>
          <p className="text-muted-foreground mb-6">You don&apos;t have any credits yet.</p>
          <Link
            href={ADD_CREDITS_HREF}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Add Credits
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Credit Balance Summary */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-[#ffffff] p-6 rounded-xl shadow-lg dark:from-[#051139] dark:to-[#02081e] dark:border dark:border-blue-950/50">
        {/* Self-serve credit top-up is not offered here — no Add Credits action. */}
        <div className="flex items-center mb-6">
          <Wallet className="h-5 w-5 mr-2 text-[#ffffff] dark:text-blue-400" />
          <h3 className="text-lg font-bold text-[#ffffff]">Billing Summary</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 text-[#ffffff]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-1 text-[#ffffff]">
              <Wallet className="h-4 w-4 mr-2 opacity-80" />
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Current Balance</span>
            </div>
            <p className="text-3xl md:text-3xl font-bold text-[#ffffff]">{balance.credits.toLocaleString()}</p>
            <p className="text-[10px] md:text-xs opacity-70 text-[#ffffff]">credits available</p>
          </div>

          <div>
            <div className="flex items-center mb-1 text-[#ffffff]">
              <TrendingUp className="h-4 w-4 mr-2 opacity-80" />
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Usage</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold text-[#ffffff]">{balance.monthlyUsage.toLocaleString()}</p>
            <p className="text-[10px] opacity-70 text-[#ffffff]">this month</p>
          </div>

          <div className="text-right md:text-left">
            <div className="flex items-center justify-end md:justify-start mb-1 text-[#ffffff]">
              <Calendar className="h-4 w-4 mr-2 opacity-80" />
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Spent</span>
            </div>
            <p className="text-lg md:text-2xl font-semibold text-[#ffffff]">{formatCurrency(balance.totalSpent)}</p>
            <p className="text-[10px] opacity-70 text-[#ffffff]">all-time</p>
          </div>
        </div>

        {balance.lastRecharge && (
          <div className="mt-5 pt-4 border-t border-white/10 dark:border-blue-950/40">
            <p className="text-[11px] opacity-80 leading-relaxed text-[#ffffff]">
              Last recharge: <span className="font-semibold text-[#ffffff]">{balance.lastRecharge.credits.toLocaleString()} credits</span> ($
              {balance.lastRecharge.amount}) on {formatDate(balance.lastRecharge.date)}
            </p>
          </div>
        )}
      </div>
      {/* Quick Actions — two cards since the Add Credits tile was removed. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/pricing"
          className="bg-card text-card-foreground p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary dark:bg-[#030a21]/60 dark:border-blue-950/30 dark:hover:border-blue-500"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground dark:text-white">View Pricing</h3>
            <ExternalLink className="h-6 w-6 text-primary dark:text-blue-400" />
          </div>
          <p className="text-sm text-muted-foreground dark:text-gray-400">See credit costs for all features</p>
        </Link>
        <button
          className="bg-card text-card-foreground p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary text-left dark:bg-[#030a21]/60 dark:border-blue-950/30 dark:hover:border-blue-500"
          onClick={() => window.print()}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground dark:text-white">Download Report</h3>
            <Download className="h-6 w-6 text-primary dark:text-blue-400" />
          </div>
          <p className="text-sm text-muted-foreground dark:text-gray-400">Export your usage and billing history</p>
        </button>
      </div>
      {/* Credit Usage Analytics */}
      <CreditUsageAnalytics timeRange="30d" />
      {/* Credit Package Recommendations */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
        <h3 className="text-xl font-bold text-foreground mb-4">Credit Package Recommendations</h3>
        <div className="space-y-4">
          {balance.credits < 500 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Low Credit Balance</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You&apos;re running low on credits. Consider purchasing the <strong>Starter Plan</strong> (1,000 credits for $99)
                      to continue using all features without interruption.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href={ADD_CREDITS_HREF}
                      className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                    >
                      Recharge now &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {balance.monthlyUsage > 3000 && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">High Usage Detected</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      You&apos;re using an average of {balance.monthlyUsage.toLocaleString()} credits per month.
                      Consider the <strong>Professional Plan</strong> (3,000 credits for $199) for better value.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href={ADD_CREDITS_HREF}
                      className="text-sm font-medium text-blue-800 hover:text-blue-900 underline"
                    >
                      Upgrade package &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {balance.credits > 5000 && balance.monthlyUsage < 1000 && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">You&apos;re All Set!</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      You have plenty of credits for your current usage. Your balance of {balance.credits.toLocaleString()} credits
                      will last approximately {Math.floor(balance.credits / (balance.monthlyUsage / 30))} days at your current rate.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
