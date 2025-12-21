'use client';

import React from 'react';
import { XCircle, ArrowLeft, Wallet } from 'lucide-react';

export default function WalletCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-orange-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recharge Cancelled
          </h1>
          
          <p className="text-gray-600 mb-8">
            Your wallet recharge was cancelled. No charges were made to your account.
          </p>

          <div className="space-y-3">
            <a
              href="/wallet"
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center"
            >
              <Wallet className="h-5 w-5 mr-2" />
              Try Again
            </a>
            
            <a
              href="/dashboard"
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            If you encountered any issues, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
