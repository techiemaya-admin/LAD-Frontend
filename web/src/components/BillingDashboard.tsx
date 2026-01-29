'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Calendar, Download, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { CreditUsageAnalytics } from './CreditUsageAnalytics';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api-utils';
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
export const BillingDashboard: React.FC<BillingDashboardProps> = ({ customerId }) => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchCreditBalance();
  }, []);
  const fetchCreditBalance = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/wallet/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch credit balance');
      }
      const data = await response.json();
      setBalance({
        credits: data.credits || 0,
        lastRecharge: data.lastRecharge || null,
        monthlyUsage: data.monthlyUsage || 0,
        totalSpent: data.totalSpent || 0
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching credit balance:', err);
      // Show zero balance on error
      setBalance({
        credits: 0,
        lastRecharge: null,
        monthlyUsage: 0,
        totalSpent: 0
      });
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
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center text-red-600 mb-4">
          <Wallet className="h-8 w-8 mx-auto mb-2" />
          <span className="text-lg font-medium">Unable to Load Billing Information</span>
        </div>
        <p className="text-gray-600 text-center">{error}</p>
      </div>
    );
  }
  if (!balance) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center">
          <Wallet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credit Balance</h3>
          <p className="text-gray-600 mb-6">You don't have any credits yet.</p>
          <Link
            href="/wallet"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center mb-2">
              <Wallet className="h-5 w-5 mr-2 opacity-80" />
              <span className="text-sm font-medium opacity-80">Current Balance</span>
            </div>
            <p className="text-4xl font-bold">{balance.credits.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">credits available</p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <TrendingUp className="h-5 w-5 mr-2 opacity-80" />
              <span className="text-sm font-medium opacity-80">Monthly Usage</span>
            </div>
            <p className="text-4xl font-bold">{balance.monthlyUsage.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">credits this month</p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 mr-2 opacity-80" />
              <span className="text-sm font-medium opacity-80">Total Spent</span>
            </div>
            <p className="text-4xl font-bold">{formatCurrency(balance.totalSpent)}</p>
            <p className="text-sm opacity-80 mt-1">all-time investment</p>
          </div>
        </div>
        {balance.lastRecharge && (
          <div className="mt-6 pt-6 border-t border-blue-400">
            <p className="text-sm opacity-80">
              Last recharge: <strong>{balance.lastRecharge.credits.toLocaleString()} credits</strong> for{' '}
              <strong>{formatCurrency(balance.lastRecharge.amount)}</strong> on{' '}
              {formatDate(balance.lastRecharge.date)}
            </p>
          </div>
        )}
      </div>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/wallet"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-600"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Add Credits</h3>
            <Wallet className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">Purchase credit packages starting at $99</p>
        </Link>
        <Link
          href="/pricing"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-600"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">View Pricing</h3>
            <ExternalLink className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">See credit costs for all features</p>
        </Link>
        <button
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-600 text-left"
          onClick={() => window.print()}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Download Report</h3>
            <Download className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">Export your usage and billing history</p>
        </button>
      </div>
      {/* Credit Usage Analytics */}
      <CreditUsageAnalytics timeRange="30d" />
      {/* Credit Package Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Credit Package Recommendations</h3>
        <div className="space-y-4">
          {balance.credits < 500 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
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
                      You're running low on credits. Consider purchasing the <strong>Starter Plan</strong> (1,000 credits for $99) 
                      to continue using all features without interruption.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/wallet"
                      className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                    >
                      Recharge now →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {balance.monthlyUsage > 3000 && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">High Usage Detected</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      You're using an average of {balance.monthlyUsage.toLocaleString()} credits per month. 
                      Consider the <strong>Professional Plan</strong> (3,000 credits for $199) for better value.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/wallet"
                      className="text-sm font-medium text-blue-800 hover:text-blue-900 underline"
                    >
                      Upgrade package →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {balance.credits > 5000 && balance.monthlyUsage < 1000 && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">You're All Set!</h3>
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