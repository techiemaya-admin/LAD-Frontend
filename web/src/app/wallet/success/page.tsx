'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { CheckCircle2, ArrowRight, Wallet } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
function WalletSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id') || null;
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  useEffect(() => {
    if (sessionId) {
      // In production, verify the session with backend
      setTimeout(() => {
        setSessionData({
          amount: 79,
          credits: 2500
        });
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }
  }, [sessionId]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {loading ? (
            <div className="py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Verifying payment...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Recharge Successful!
              </h1>
              <p className="text-gray-600 mb-8">
                Your wallet has been credited successfully.
              </p>
              {sessionData && (
                <div className="bg-green-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-700 font-medium">Amount Paid</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${sessionData.amount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Credits Added</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {sessionData.credits.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <a
                  href="/wallet"
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  View Wallet
                </a>
                <a
                  href="/dashboard"
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                A confirmation email has been sent to your registered email address.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default function WalletSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <WalletSuccessContent />
    </Suspense>
  );
}