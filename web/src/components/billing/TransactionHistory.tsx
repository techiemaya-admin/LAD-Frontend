'use client';
import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, ExternalLink, Eye, Cpu } from 'lucide-react';
import { useTransactions } from '@lad/frontend-features/billing';
import { LoadingSpinner } from '../LoadingSpinner';
import { TransactionDetailModal } from './TransactionDetailModal';

type TransactionType = 'credit' | 'debit' | 'all';
type TimeRange = '7d' | '30d' | '90d' | 'all';

export const TransactionHistory: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    if (timeRange === 'all') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeRange as '7d' | '30d' | '90d'];
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }, [timeRange]);

  // Fetch transactions
  const { data: txData, isLoading } = useTransactions({
    type: transactionType !== 'all' ? transactionType : undefined,
    startDate,
    endDate,
    limit: 200,
  });

  // Credits-per-dollar from server (plan-aware)
  const creditsPerDollar: number = (txData as any)?.creditsPerDollar ?? (1000 / 99);
  const planTier: string = (txData as any)?.planTier ?? 'starter';

  // Normalize
  const normalizeTransaction = (tx: any) => ({
    ...tx,
    type: tx.type || (tx.transaction_type === 'topup' || tx.transaction_type === 'credit' ? 'credit' : 'debit'),
  });

  // Filter
  const filteredTransactions = useMemo(() => {
    if (!txData?.transactions) return [];
    const normalized = txData.transactions.map(normalizeTransaction);
    if (!searchTerm) return normalized;
    const s = searchTerm.toLowerCase();
    return normalized.filter((tx: any) =>
      tx.description?.toLowerCase().includes(s) ||
      tx.reference_type?.toLowerCase().includes(s) ||
      tx.reference_id?.toLowerCase().includes(s) ||
      (tx.type || tx.transaction_type)?.toLowerCase().includes(s)
    );
  }, [txData, searchTerm]);

  // Summary stats in credits
  const stats = useMemo(() => {
    if (!filteredTransactions.length) return { credits: 0, debits: 0, net: 0 };
    const added = filteredTransactions
      .filter((tx: any) => tx.type === 'credit')
      .reduce((sum: number, tx: any) => sum + (tx.credits_amount ?? Math.abs(parseFloat(tx.amount)) * creditsPerDollar), 0);
    const used = filteredTransactions
      .filter((tx: any) => tx.type === 'debit')
      .reduce((sum: number, tx: any) => sum + (tx.credits_amount ?? Math.abs(parseFloat(tx.amount)) * creditsPerDollar), 0);
    return { credits: added, debits: used, net: added - used };
  }, [filteredTransactions, creditsPerDollar]);

  // Formatters
  const formatCredits = (val: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(val) + ' cr';

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getTypeColor = (type: string) =>
    type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  const getTypeIcon = (type: string) =>
    type === 'credit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />;

  const isLLMUsage = (tx: any) => tx.source === 'llm_usage' || tx.reference_type === 'llm_usage';

  const getCreditsAmount = (tx: any): number =>
    tx.credits_amount ?? Math.abs(parseFloat(tx.amount || '0')) * creditsPerDollar;

  const getCreditsBalance = (tx: any): number | null =>
    tx.credits_balance_after ?? (tx.balance_after != null ? parseFloat(tx.balance_after) * creditsPerDollar : null);

  if (isLoading) return <LoadingSpinner size="md" message="Loading transaction history..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
          <p className="text-gray-600 mt-1">View all credits and debits for your account</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Net Balance Change</div>
          <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.net >= 0 ? '+' : '-'}
            {formatCredits(Math.abs(stats.net))}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{planTier} plan · {creditsPerDollar.toFixed(1)} cr/$</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Credits Added</span>
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCredits(stats.credits)}</div>
          <p className="text-xs text-gray-500 mt-1">Credits added to account</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Credits Used</span>
            <ArrowUpRight className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCredits(stats.debits)}</div>
          <p className="text-xs text-gray-500 mt-1">Credits consumed</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Transactions</span>
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</div>
          <p className="text-xs text-gray-500 mt-1">In selected period</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as TransactionType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="credit">Credits Only</option>
              <option value="debit">Debits Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search description, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (Credits)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No transactions found</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction: any) => {
                  const creditsAmt = getCreditsAmount(transaction);
                  const creditsBal = getCreditsBalance(transaction);
                  const isAI = isLLMUsage(transaction);
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                            {getTypeIcon(transaction.type)}
                            {transaction.type.toUpperCase()}
                          </span>
                          {isAI && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Cpu className="h-3 w-3" />
                              AI
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {transaction.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.reference_type && transaction.reference_id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">{transaction.reference_type}</span>
                            <button className="text-blue-600 hover:text-blue-700" title={`View ${transaction.reference_type}`}>
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatCredits(creditsAmt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creditsBal != null ? formatCredits(creditsBal) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => { setSelectedTransaction(transaction); setIsDetailModalOpen(true); }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                          title="View transaction details"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};
