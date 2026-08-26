'use client';
// R8 Phase 3 - Welcome step. Intentionally light - sets the tone for the
// wizard and primes the tenant for the ICP capture step that comes next.

import * as React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WizardWelcomeStepProps {
  onContinue: () => void;
}

export default function WizardWelcomeStep({ onContinue }: WizardWelcomeStepProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 sm:py-20 text-center">
      <div
        className="w-14 h-14 mx-auto rounded-2xl grid place-items-center mb-6"
        style={{ background: 'linear-gradient(135deg, #0B1957, #172560)' }}
      >
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h1
        className="text-3xl sm:text-4xl font-bold text-[#1e293b] dark:text-white"
        style={{ fontFamily: '"Space Grotesk", system-ui' }}
      >
        Welcome to Mr LAD
      </h1>
      <p className="mt-3 text-[14px] text-slate-600 dark:text-[#7a8ba3] max-w-lg mx-auto">
        Three quick steps to get your agent running. We&apos;ll capture who your ideal customer is,
        then connect the channels you want to reach them on.
      </p>
      <ul className="mt-8 max-w-md mx-auto text-left space-y-3">
        <Item n="1" title="Tell us about your company" desc="Name, industry, what you sell." />
        <Item n="2" title="Describe your ideal customer" desc="Industry, geography, titles, size." />
        <Item n="3" title="Connect your channels" desc="LinkedIn, email, WhatsApp: pick any." />
      </ul>
      <div className="mt-10">
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-[14px] font-semibold text-white shadow-sm hover:opacity-95 transition"
          style={{ background: '#0B1957' }}
        >
          Get started <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Item({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="w-7 h-7 shrink-0 rounded-full grid place-items-center text-[12px] font-semibold"
        style={{ background: '#e8ebf7', color: '#0B1957' }}
      >
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#172560] dark:text-white">{title}</p>
        <p className="text-[12px] text-slate-500 dark:text-[#7a8ba3]">{desc}</p>
      </div>
    </li>
  );
}
