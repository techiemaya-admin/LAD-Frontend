'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft, CreditCard, HelpCircle } from 'lucide-react';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-orange-500 mb-6">
          <XCircle className="h-16 w-16 mx-auto" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment has been cancelled. No charges were made to your account.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Need help with your subscription?
          </h3>
          <p className="text-sm text-gray-600">
            If you experienced any issues during checkout or have questions about our plans, 
            we're here to help.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          
          <button
            onClick={() => router.push('/contact')}
            className="w-full py-2 px-4 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center justify-center"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}