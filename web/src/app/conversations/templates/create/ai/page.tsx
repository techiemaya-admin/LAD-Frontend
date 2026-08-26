'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AIEmailGeneratorQuestionnaire from '@/components/templates/AIEmailGeneratorQuestionnaire';
import AIEmailGeneratorPreview from '@/components/templates/AIEmailGeneratorPreview';

type PageState = 'questionnaire' | 'loading' | 'preview' | 'error';

interface EmailContent {
  subject: string;
  body: string;
  generated_at?: string;
}

export default function AIGeneratePage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('questionnaire');
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [error, setError] = useState('');

  const handleQuestionnaireComplete = async (answers: any) => {
    setPageState('loading');
    setError('');

    try {
      const response = await fetch('/api/campaigns/email-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorData.details || errorDetail;
        } catch (e) {}
        throw new Error(`Failed to generate email: ${errorDetail}`);
      }

      const data = await response.json();
      setEmailContent(data.data);
      setPageState('preview');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setPageState('error');
    }
  };

  const handleBack = () => {
    if (pageState === 'preview') {
      setPageState('questionnaire');
      setEmailContent(null);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000724] transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#000c3b] border-b border-gray-200 dark:border-gray-800 px-8 py-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generate Email with AI</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12 bg-transparent">
        {pageState === 'questionnaire' && (
          <AIEmailGeneratorQuestionnaire
            onComplete={handleQuestionnaireComplete}
            onCancel={() => router.back()}
          />
        )}

        {pageState === 'loading' && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Generating your email with AI...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">This may take a moment</p>
            </div>
          </div>
        )}

        {pageState === 'preview' && emailContent && (
          <AIEmailGeneratorPreview emailContent={emailContent} onBack={handleBack} />
        )}

        {pageState === 'error' && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">Error Generating Email</h2>
            <p className="text-red-700 dark:text-red-300 mb-4 text-sm">{error}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setPageState('questionnaire')}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 font-medium text-sm transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/20 font-medium text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
