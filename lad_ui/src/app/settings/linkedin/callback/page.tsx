'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-utils';

function LinkedInCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    const error = searchParams?.get('error');
    const errorDescription = searchParams?.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || 'LinkedIn authorization failed');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received from LinkedIn');
      return;
    }

    // Verify state
    const savedState = sessionStorage.getItem('linkedin_oauth_state');
    if (state !== savedState) {
      setStatus('error');
      setMessage('Invalid state parameter. Possible CSRF attack.');
      return;
    }

    // Exchange code for access token
    if (code && state) {
      handleCallback(code, state);
    }
  }, [searchParams]);

  const handleCallback = async (code: string, state: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/linkedin/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect LinkedIn account');
      }

      const data = await response.json();
      
      setStatus('success');
      setMessage(`Successfully connected to LinkedIn as ${data.profile.name}`);

      // Clear state
      sessionStorage.removeItem('linkedin_oauth_state');

      // Redirect to settings after 2 seconds
      setTimeout(() => {
        router.push('/settings');
      }, 2000);

    } catch (error) {
      console.error('LinkedIn callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to connect LinkedIn account');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connecting LinkedIn...
            </h1>
            <p className="text-gray-600">
              Please wait while we complete the authentication process.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              LinkedIn Connected!
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">
              Redirecting you to settings...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Failed
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/settings')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <LinkedInCallbackContent />
    </Suspense>
  );
}
