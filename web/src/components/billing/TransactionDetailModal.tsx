'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, Copy, ExternalLink } from 'lucide-react';

interface Transaction {
  id: string;
  amount: string;
  type: 'credit' | 'debit';
  description: string;
  reference_type?: string;
  reference_id?: string;
  balance_after?: string;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  if (!transaction) return null;

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string = 'completed') => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={`p-2 rounded-full ${
                transaction.type === 'credit'
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}
            >
              {transaction.type === 'credit' ? (
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              )}
            </div>
            Transaction Details
          </DialogTitle>
          <DialogDescription>
            {transaction.type === 'credit' ? 'Credit' : 'Debit'} transaction
            from {formatDate(transaction.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction ID */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Transaction ID
            </label>
            <div className="flex items-center justify-between mt-1 p-3 bg-gray-50 rounded-lg">
              <code className="text-sm font-mono text-gray-900">
                {transaction.id.slice(0, 20)}...
              </code>
              <button
                onClick={() => copyToClipboard(transaction.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <Copy className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Amount
            </label>
            <div className="mt-1 text-2xl font-bold">
              <span
                className={
                  transaction.type === 'credit'
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {transaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Status
            </label>
            <div className="mt-1">
              <Badge variant="outline" className={getStatusColor(transaction.status)}>
                {transaction.status.charAt(0).toUpperCase() +
                  transaction.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Description
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                {transaction.description}
              </div>
            </div>
          )}

          {/* Reference */}
          {transaction.reference_type && transaction.reference_id && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Reference
              </label>
              <div className="mt-1 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    {transaction.reference_type}
                  </div>
                  <div className="text-gray-600">
                    {transaction.reference_id}
                  </div>
                </div>
                <button className="p-1 hover:bg-blue-100 rounded transition-colors">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            </div>
          )}

          {/* Balance After */}
          {transaction.balance_after && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Balance After Transaction
              </label>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(transaction.balance_after)}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="pt-2 border-t border-gray-200">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Date & Time
            </label>
            <div className="mt-1 text-sm text-gray-600">
              {formatDate(transaction.created_at)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
