'use client';
// R8 Phase 3 - Company step.
//
// Collects the "company half" of the 14-field business profile (6 fields).
// The other 8 fields are gathered by the chat in the ICP step. All 14 are
// persisted to ai_icp_profiles.icp_data via `useBusinessProfile()`
// - same hook the ICP Discovery drawer and Settings → Business Profile use,
// so the three surfaces always agree on what's saved.

import * as React from 'react';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import {
  useBusinessProfile,
  BUSINESS_PROFILE_COMPANY_HALF,
  type BusinessProfile,
} from '@lad/frontend-features/ai-icp-assistant';

// The six fields this step owns. Order matters - drives form layout.
type CompanyHalfKey = (typeof BUSINESS_PROFILE_COMPANY_HALF)[number];

interface WizardCompanyStepProps {
  onBack: () => void;
  onContinue: () => void;
}

export default function WizardCompanyStep({ onBack, onContinue }: WizardCompanyStepProps) {
  const { profile, loading, saving, save, error } = useBusinessProfile();

  // Local working copy so each keystroke doesn't bounce through the hook.
  // Initial value comes from the loaded profile; we re-sync once when load
  // completes so a returning user sees their saved values pre-filled.
  const [form, setForm] = useState<Partial<BusinessProfile>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !hydrated) {
      const next: Partial<BusinessProfile> = {};
      for (const k of BUSINESS_PROFILE_COMPANY_HALF) {
        next[k] = typeof profile[k] === 'string' ? (profile[k] as string) : '';
      }
      setForm(next);
      setHydrated(true);
    }
  }, [loading, hydrated, profile]);

  const setField = (k: CompanyHalfKey, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const isValid =
    (form.companyName || '').trim().length > 1 &&
    (form.industry || '').trim().length > 1;

  const handleContinue = async () => {
    if (!isValid || saving) return;
    try {
      await save(form);
      onContinue();
    } catch {
      // `error` from the hook surfaces below; don't navigate on failure.
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center"
          style={{ background: '#e8ebf7' }}
        >
          <Building2 className="w-5 h-5" style={{ color: '#0B1957' }} />
        </div>
        <div>
          <h1
            className="text-[22px] font-bold text-[#1e293b] dark:text-white"
            style={{ fontFamily: '"Space Grotesk", system-ui' }}
          >
            Tell us about your company
          </h1>
          <p className="text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">
            We&apos;ll use this to personalise the rest of the setup. You can edit anything later in Settings.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Company name" required>
          <input
            type="text"
            autoFocus
            value={form.companyName || ''}
            onChange={(e) => setField('companyName', e.target.value)}
            placeholder="Acme Inc."
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="Industry" required hint="Comma-separate if you serve multiple.">
          <input
            type="text"
            value={form.industry || ''}
            onChange={(e) => setField('industry', e.target.value)}
            placeholder="B2B SaaS, Healthtech, Fintech…"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="Website">
          <input
            type="url"
            value={form.website || ''}
            onChange={(e) => setField('website', e.target.value)}
            placeholder="https://acme.com"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="What you sell" hint="One line is fine. Keeps the chat focused.">
          <textarea
            rows={2}
            value={form.valueProposition || ''}
            onChange={(e) => setField('valueProposition', e.target.value)}
            placeholder="AI sales assistant for outbound teams in MENA."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30 resize-none"
          />
        </Field>
        <Field label="Products & services" hint="A short list of what the prospect actually buys.">
          <textarea
            rows={2}
            value={form.productsServices || ''}
            onChange={(e) => setField('productsServices', e.target.value)}
            placeholder="LinkedIn outreach automation, AI lead qualification, WhatsApp drip campaigns."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30 resize-none"
          />
        </Field>
        <Field label="Target customers" hint="Who you sell to in plain language. The ICP step will dig in.">
          <textarea
            rows={2}
            value={form.targetCustomers || ''}
            onChange={(e) => setField('targetCustomers', e.target.value)}
            placeholder="Sales-led B2B SaaS companies in MENA running outbound on LinkedIn."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30 resize-none"
          />
        </Field>
        <Field label="Agent speaks as" hint="The name the LinkedIn agent messages prospects as.">
          <input
            type="text"
            value={form.personaName || ''}
            onChange={(e) => setField('personaName', e.target.value)}
            placeholder="e.g. Sneha"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="Your title / role" hint="How you introduce yourself.">
          <input
            type="text"
            value={form.personaTitle || ''}
            onChange={(e) => setField('personaTitle', e.target.value)}
            placeholder="e.g. Founder"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="Booking / calendar link" hint="Optional. Offered when a prospect is ready for a call.">
          <input
            type="url"
            value={form.bookingLink || ''}
            onChange={(e) => setField('bookingLink', e.target.value)}
            placeholder="https://cal.com/you/intro"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="Contact email" hint="Optional. Shared by the agent when a prospect asks how to reach you.">
          <input
            type="email"
            value={form.contactEmail || ''}
            onChange={(e) => setField('contactEmail', e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
        <Field label="Contact phone" hint="Optional. Shared by the agent when a prospect asks how to reach you.">
          <input
            type="tel"
            value={form.contactPhone || ''}
            onChange={(e) => setField('contactPhone', e.target.value)}
            placeholder="+971 50 123 4567"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-4 text-[12px] text-red-600 dark:text-red-400">
          Couldn&apos;t save: {error.message}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="h-10 px-3.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!isValid || saving}
          className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#0B1957' }}
        >
          {saving ? 'Saving…' : (<>Continue <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-[#172560] dark:text-white inline-flex items-center gap-1">
        {label}
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </span>
      {hint && (
        <span className="block text-[11.5px] text-slate-500 dark:text-[#7a8ba3] mt-0.5 mb-1.5">{hint}</span>
      )}
      <div className={hint ? '' : 'mt-1.5'}>{children}</div>
    </label>
  );
}
