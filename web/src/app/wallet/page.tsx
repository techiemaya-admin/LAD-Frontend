'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { WalletBalance } from '../../components/WalletBalance';
import { Button } from '../../components/ui/button';

export default function WalletPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors p-0 h-auto hover:bg-transparent group"
          >
            <div className="p-1.5 rounded-full bg-white shadow-sm border border-slate-200 group-hover:border-slate-300 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">Back</span>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your credits and view transaction history
          </p>
        </div>
        <WalletBalance />
      </div>
    </div>
  );
}