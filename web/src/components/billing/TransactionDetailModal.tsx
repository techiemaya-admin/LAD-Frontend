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
import { ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';

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

  // Ledger amounts are CREDIT-denominated - format as credits, not USD.
  const formatCredits = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num) + ' cr';
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
        return 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 font-bold';
      case 'pending':
        return 'bg-amber-950/20 text-amber-400 border-amber-900/40 font-bold';
      case 'failed':
        return 'bg-rose-950/20 text-rose-400 border-rose-900/40 font-bold';
      default:
        return 'bg-slate-900/40 text-slate-400 border-slate-800 font-bold';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#000319] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[560px] p-5 sm:p-6 text-slate-800 dark:text-white max-h-[92vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="space-y-2 dark:bg-[#000319]">
          <DialogTitle className="flex items-center gap-3 text-slate-800 dark:text-white font-bold text-lg leading-tight dark:bg-dark-blue">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
                      transaction.type === 'credit'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                  }`}
              >
                {transaction.type === 'credit' ? (
                    <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                    <ArrowUpRight className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <span>Transaction Details</span>
            </DialogTitle>
            {/*<DialogDescription className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wider mt-1">*/}
              {/*{transaction.type === 'credit' ? 'Credit' : 'Debit'} transaction*/}
            {/*</DialogDescription>*/}
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Amount Display */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                Amount
              </label>
              <div className="mt-1 text-2xl font-bold tracking-tight">
              <span
                  className={
                    transaction.type === 'credit'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                  }
              >
                {transaction.type === 'credit' ? '+' : '-'}
                {formatCredits(transaction.amount)}
              </span>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                Status
              </label>
              <div className="mt-1.5">
                <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </Badge>
              </div>
            </div>

            {/* Transaction ID Display */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                Transaction ID
              </label>
              {/* FIXED: Swapped light mode fallback wrappers for dark theme inner container (#00051d/60) */}
              <div className="flex items-center justify-between mt-1 p-3 bg-slate-50/50 dark:bg-[#00051d]/60 rounded-xl border border-slate-100 dark:border-slate-800/60 font-semibold">
                <code className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all pr-2">
                  {transaction.id}
                </code>
                <button
                    type="button"
                    onClick={() => copyToClipboard(transaction.id)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900/60 rounded-lg transition-all flex-shrink-0 cursor-pointer text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white border-none"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Description Block */}
            {transaction.description && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                    Description
                  </label>
                  <div className="mt-1 p-3 bg-slate-50/50 dark:bg-[#00051d]/60 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    {transaction.description}
                  </div>
                </div>
            )}

            {/* Reference Block */}
            {transaction.reference_type && transaction.reference_id && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                    Reference Link
                  </label>
                  {/* FIXED: Matched styling with platform design specifications */}
                  <div className="mt-1 flex items-center justify-between p-3 bg-slate-50/50 dark:bg-[#00051d]/60 rounded-xl border border-slate-100 dark:border-slate-800/60 font-semibold">
                    <div className="text-xs min-w-0 flex-1 pr-2">
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-[10px] text-blue-500 dark:text-blue-400">
                        {transaction.reference_type}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-xs mt-0.5 truncate">
                        {transaction.reference_id}
                      </div>
                    </div>
                    <button
                        type="button"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900/60 rounded-lg transition-all flex-shrink-0 cursor-pointer text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white border-none"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
            )}

          {/* Balance After */}
          {transaction.balance_after && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                Balance After Transaction
              </label>
              <div className="mt-1 text-base font-bold text-slate-700 dark:text-slate-300">
                {formatCredits(transaction.balance_after)}
              </div>
            </div>
          )}

            {/* Timestamp Footer Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-900/40">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                Date & Time
              </label>
              <div className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                {formatDate(transaction.created_at)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
};
