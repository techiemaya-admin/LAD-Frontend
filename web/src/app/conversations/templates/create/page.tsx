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
      {/* Desktop Header / Mobile Inline Header Wrapper */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 md:py-6 dark:bg-[#000724] dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer text-sm md:text-base self-start"
          >
            ← Back
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Create Email Template
          </h1>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-12">
        <p className="text-gray-600 dark:text-slate-300 text-sm md:text-base mb-6 md:mb-8">
          Choose how you&apos;d like to create your communication template:
        </p>

        {/* Grid on Desktop (md:grid-cols-2), Stacked Blocks on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          {/* Manual Editor Option */}
          <button
            onClick={() => {
              setSelected('manual');
              setTimeout(handleManualCreate, 200);
            }}
            className={`p-5 md:p-8 rounded-xl md:rounded-lg border-2 transition-all text-left ${
              selected === 'manual'
                ? 'border-[#0b1957] bg-[#0b1957]/5 dark:border-[#3b52b3] dark:bg-[#3b52b3]/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-gray-800 dark:bg-[#000c3b] dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3.5 md:gap-4">
              {/* Boxed Icon on Mobile, Plain Emoji on Desktop */}
              <div className="text-2xl md:text-3xl p-2.5 md:p-0 rounded-xl bg-slate-100 md:bg-transparent dark:bg-[#0b1438] md:dark:bg-transparent border border-slate-200/60 md:border-none dark:border-slate-800/80">
                ✍️
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 md:mb-2">
                  Create Manually
                </h2>
                <p className="text-xs md:text-base text-gray-600 dark:text-slate-300 leading-relaxed mb-3 md:mb-0">
                  Write and customize your template copy directly using our responsive formatting editor. Perfect for when you already know exactly what you want to say.
                </p>

                {/* 2-Column Grid Checklist on Mobile, Standard List on Desktop */}
                <ul className="mt-2 md:mt-4 grid grid-cols-2 md:block gap-y-1.5 md:space-y-1 text-xs md:text-sm text-gray-600 dark:text-slate-300">
                  <li className="flex items-center gap-1.5 md:block">
                    <span className="text-emerald-500 font-bold md:font-normal dark:text-emerald-400 md:dark:text-slate-300">✓</span> Full control over content
                  </li>
                  <li className="flex items-center gap-1.5 md:block">
                    <span className="text-emerald-500 font-bold md:font-normal dark:text-emerald-400 md:dark:text-slate-300">✓</span> Quick and straightforward
                  </li>
                  <li className="col-span-2 flex items-center gap-1.5 md:block">
                    <span className="text-emerald-500 font-bold md:font-normal dark:text-emerald-400 md:dark:text-slate-300">✓</span> Use dynamic placeholders
                  </li>
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
            className={`p-5 md:p-8 rounded-xl md:rounded-lg border-2 transition-all text-left ${
              selected === 'ai'
                ? 'border-[#0b1957] bg-[#0b1957]/5 dark:border-[#3b52b3] dark:bg-[#3b52b3]/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-gray-800 dark:bg-[#000c3b] dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3.5 md:gap-4">
              {/* Boxed Icon on Mobile, Plain Emoji on Desktop */}
              <div className="text-2xl md:text-3xl p-2.5 md:p-0 rounded-xl bg-slate-100 md:bg-transparent dark:bg-[#0b1438] md:dark:bg-transparent border border-slate-200/60 md:border-none dark:border-slate-800/80">
                ✨
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 md:mb-2 flex-wrap">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                    Generate with AI
                  </h2>
                  {/* Badge shown on Mobile */}
                  <span className="md:hidden px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                    GEMINI CORE
                  </span>
                </div>

                <p className="text-xs md:text-base text-gray-600 dark:text-slate-300 leading-relaxed mb-3 md:mb-0">
                  Answer a few questions about your campaign and let AI generate professional copy for you. Configured using your brand core profile.
                </p>

                {/* 2-Column Grid Checklist on Mobile, Standard List on Desktop */}
                <ul className="mt-2 md:mt-4 grid grid-cols-2 md:block gap-y-1.5 md:space-y-1 text-xs md:text-sm text-gray-600 dark:text-slate-300">
                  <li className="flex items-center gap-1.5 md:block">
                    <span className="text-emerald-500 font-bold md:font-normal dark:text-emerald-400 md:dark:text-slate-300">✓</span> AI-powered generation
                  </li>
                  <li className="flex items-center gap-1.5 md:block">
                    <span className="text-emerald-500 font-bold md:font-normal dark:text-emerald-400 md:dark:text-slate-300">✓</span> Edit and refine as needed
                  </li>
                  <li className="col-span-2 flex items-center gap-1.5 md:block">
                    <span className="text-emerald-500 font-bold md:font-normal dark:text-emerald-400 md:dark:text-slate-300">✓</span> Based on campaign details
                  </li>
                </ul>
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
