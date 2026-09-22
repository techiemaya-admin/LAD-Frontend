'use client';
import React, { useState } from 'react';
import { BillingDashboard } from '../BillingDashboard';
import { TransactionHistory } from '../billing/TransactionHistory';
import { CreditUsageAnalytics } from '../CreditUsageAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, TrendingUp, Receipt } from 'lucide-react';

export const BillingSettings: React.FC = () => {
  // In a real application, you would get the customer ID from your authentication system
  // For now, we'll use a mock customer ID
  const customerId = 'cus_mock_customer_id';
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-8 min-h-screen px-2 py-6 sm:px-4 lg:px-6">
      {/* Main Billing Dashboard */}
      <div>
        <BillingDashboard customerId={customerId} />
      </div>

      {/* Tabs for detailed views */}
      <div className="dark:bg-[#071131] rounded-3xl shadow-md p-6 border border-border dark:border-blue-950/40">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-transparent dark:bg-[#071131] border border-transparent dark:border-blue-950/40 rounded-3xl">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-slate-900 dark:text-slate-200 data-[state=active]:bg-blue-950 dark:data-[state=active]:bg-blue-950 data-[state=active]:text-white">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2 text-slate-900 dark:text-slate-200 data-[state=active]:bg-blue-950 dark:data-[state=active]:bg-blue-950 data-[state=active]:text-white">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2 text-slate-900 dark:text-slate-200 data-[state=active]:bg-blue-950 dark:data-[state=active]:bg-blue-950 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Usage Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 text-slate-900 dark:text-slate-100">
            <div className="text-lg font-semibold">Account Overview</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card dark:bg-[#030a21]/60 rounded-3xl p-6 border border-transparent dark:border-blue-950/40">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Quick Stats</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  View your current balance, recent transactions, and usage summary.
                </p>
              </div>
              <div className="bg-card dark:bg-[#030a21]/60 rounded-3xl p-6 border border-transparent dark:border-blue-950/40">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Payment Methods</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Manage your payment methods and billing preferences.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 text-slate-100">
            <div className="text-lg font-semibold mb-4">Transaction History & Details</div>
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="usage" className="space-y-4 text-slate-100">
            <div className="text-lg font-semibold mb-4">Credit Usage Analytics</div>
            <CreditUsageAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
