'use client';

import React from 'react';
import { WalletBalance } from '../../components/WalletBalance';

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-gray-600">
            Manage your credits and view transaction history
          </p>
        </div>
        
        <WalletBalance />
      </div>
    </div>
  );
}
