'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, Filter, ExternalLink } from 'lucide-react';
import { useTransactions } from '@/sdk/features/billing';
import { LoadingSpinner } from '../LoadingSpinner';

type TransactionType = 'credit' | 'debit' | 'all';
type TimeRange = '7d' | '30d' | '90d' | 'all';

export const TransactionHistory: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    if (timeRange === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeRange as '7d' | '30d' | '90d'];
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [timeRange]);

  // Fetch transactions
  const { data: transactions, isLoading } = useTransactions({
    type: transactionType !== 'all' ? transactionType : undefined,
    startDate,
    endDate,
    limit: 100,
  });

  // Filter by search term
  const filteredTransactions = useMemo(() => {
    if (!transactions?.transactions) return [];
    if (!searchTerm) return transactions.transactions;

    const search = searchTerm.toLowerCase();
    return transactions.transactions.filter((tx) => {
      return (
        tx.description?.toLowerCase().includes(search) ||
        tx.reference_type?.toLowerCase().includes(search) ||
        tx.reference_id?.toLowerCase().includes(search) ||
        tx.type.toLowerCase().includes(search)
      );
    });
  }, [transactions, searchTerm]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!filteredTransactions) return { credits: 0, debits: 0, net: 0 };

    const credits = filteredTransactions
      .filter((tx) => tx.type === 'credit')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const debits = filteredTransactions
      .filter((tx) => tx.type === 'debit')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return { credits, debits, net: credits - debits };
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeColor = (type: string) => {
    return type === 'credit'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowDownLeft className="h-4 w-4" />
    ) : (
      <ArrowUpRight className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return <LoadingSpinner size="md" message="Loading transaction history..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
          <p className="text-gray-600 mt-1">
            View all credits and debits for your account
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Net Balance Change</div>
          <div
            className={`text-2xl font-bold ${
              stats.net >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stats.net >= 0 ? '+' : ''}
            {formatCurrency(stats.net)}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Credits</span>
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.credits)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Money added to account</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Debits</span>
            <ArrowUpRight className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.debits)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Credits consumed</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Transactions</span>
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredTransactions.length}
          </div>
          <p className="text-xs text-gray-500 mt-1">In selected period</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
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

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
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

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance After
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No transactions found</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                          transaction.type
                        )}`}
                      >
                        {getTypeIcon(transaction.type)}
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.reference_type && transaction.reference_id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">
                            {transaction.reference_type}
                          </span>
                          <button
                            className="text-blue-600 hover:text-blue-700"
                            title={`View ${transaction.reference_type}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span
                        className={
                          transaction.type === 'credit'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(parseFloat(transaction.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.balance_after
                        ? formatCurrency(parseFloat(transaction.balance_after))
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
