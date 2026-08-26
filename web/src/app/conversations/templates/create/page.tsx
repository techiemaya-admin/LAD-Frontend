'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateTemplatePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<'manual' | 'ai' | null>(null);

  const handleManualCreate = () => {
    router.push('/conversations/templates/create/manual');
  };

  const handleAIGenerate = () => {
    router.push('/conversations/templates/create/ai');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 sm:px-12 md:px-16 py-6 sm:py-8 dark:bg-[#000724] dark:border-slate-800/60">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Create Email Template
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 mt-1.5">
              Choose how you&apos;d like to create your communication template:
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 sm:px-12 md:px-16 pt-6 sm:pt-8 pb-12 sm:pb-16">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Editor Option */}
          <button
            onClick={() => {
              setSelected('manual');
              setTimeout(handleManualCreate, 200);
            }}
            className={`p-8 rounded-lg border-2 transition-all text-left ${
              selected === 'manual'
                ? 'border-[#0b1957] bg-[#0b1957]/5 dark:border-[#3b52b3] dark:bg-[#3b52b3]/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-blue-950/40 dark:bg-[#071131] dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">✍️</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Create Manually</h2>
                <p className="text-gray-600 dark:text-slate-300">Write and customize your email content directly. Perfect for when you already know exactly what you want to say.</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                  <li>✓ Full control over content</li>
                  <li>✓ Use dynamic placeholders</li>
                  <li>✓ Quick and straightforward</li>
                </ul>
              </div>
            </div>
          </button>

          {/* AI Generation Option */}
          <button
            onClick={() => {
              setSelected('ai');
              setTimeout(handleAIGenerate, 200);
            }}
            className={`p-8 rounded-lg border-2 transition-all text-left ${
              selected === 'ai'
                ? 'border-[#0b1957] bg-[#0b1957]/5 dark:border-[#3b52b3] dark:bg-[#3b52b3]/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-blue-950/40 dark:bg-[#071131] dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">✨</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Generate with AI</h2>
                <p className="text-gray-600 dark:text-slate-300">Answer a few questions about your campaign and let AI generate professional email content for you.</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                  <li>✓ AI-powered content generation</li>
                  <li>✓ Based on your campaign details</li>
                  <li>✓ Edit and refine as needed</li>
                </ul>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
