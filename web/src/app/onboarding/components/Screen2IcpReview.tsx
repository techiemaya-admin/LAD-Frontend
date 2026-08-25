'use client';
// R8 Phase 5 - structured-form view of the ICP captured by the chat. Reads
// the active definition via useActiveIcpDefinition, lets the tenant tweak
// every field, saves via update() + updateTuning() on Continue.

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, Loader2, Inbox } from 'lucide-react';
import {
  useActiveIcpDefinition,
  useIcpDefinitionMutations,
  type IcpStructured,
} from '@lad/frontend-features/ai-icp-assistant';

import IndustryChipInput from './icp-review/IndustryChipInput';
import SeniorityPillSelect from './icp-review/SeniorityPillSelect';
import CountryDropdown from './icp-review/CountryDropdown';
import FitWeightsSliders from './icp-review/FitWeightsSliders';
import DiscoveryBackendsToggle from './icp-review/DiscoveryBackendsToggle';

interface Screen2IcpReviewProps {
  onBack: () => void;
  onContinue: () => void;
  /** Lets the wizard refetch the active ICP after we save. */
  onSavedRefetch?: () => void;
}

const DEFAULT_WEIGHTS: NonNullable<IcpStructured['fit_weights']> = {
  industry_match: 0.7,
  size_match: 0.5,
  seniority_match: 0.7,
  title_match: 0.8,
  geo_match: 0.6,
  tech_stack_match: 0.3,
};

export default function Screen2IcpReview({
  onBack, onContinue, onSavedRefetch,
}: Screen2IcpReviewProps) {
  const { definition, loading, error: loadError } = useActiveIcpDefinition();
  const { update, updateTuning, loading: saving, error: saveError } = useIcpDefinitionMutations({
    onSuccess: () => {
      onSavedRefetch?.();
    },
  });

  // ── local editable state ────────────────────────────────────────────────
  const [icp, setIcp] = useState<IcpStructured | null>(null);
  const [minFit, setMinFit] = useState<number>(0.6);
  const [dailyCap, setDailyCap] = useState<number>(500);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!definition) return;
    setIcp(definition.icp_definition);
    // Postgres NUMERIC columns deserialize as strings via JSON (to preserve
    // precision), so coerce explicitly - `?? 0.6` alone doesn't catch "0.60".
    const fit = Number(definition.min_fit_score);
    setMinFit(Number.isFinite(fit) ? fit : 0.6);
    const cap = Number(definition.daily_search_cap);
    setDailyCap(Number.isFinite(cap) ? cap : 500);
  }, [definition]);

  // ── change helpers ──────────────────────────────────────────────────────
  const updateCompany = (key: keyof IcpStructured['company'], value: unknown) => {
    setIcp((prev) => (prev ? { ...prev, company: { ...prev.company, [key]: value } } : prev));
  };
  const updatePerson = (key: keyof IcpStructured['person'], value: unknown) => {
    setIcp((prev) => (prev ? { ...prev, person: { ...prev.person, [key]: value } } : prev));
  };

  const fitWeights = icp?.fit_weights ?? DEFAULT_WEIGHTS;

  // ── save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!definition || !icp) return;
    try {
      await update(definition.id, { icp_definition: icp });
      await updateTuning(definition.id, {
        min_fit_score: minFit,
        daily_search_cap: dailyCap,
      });
      onContinue();
    } catch {
      // useIcpDefinitionMutations surfaces the error in `saveError` - fall through.
    }
  };

  // ── render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center text-[13px] text-slate-500 dark:text-[#7a8ba3]">
        <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
        Loading your ICP…
      </div>
    );
  }

  if (!definition || !icp) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center">
          <Inbox className="w-8 h-8 mx-auto text-slate-400 mb-3" />
          <h2
            className="text-[18px] font-bold text-[#1e293b] dark:text-white"
            style={{ fontFamily: '"Space Grotesk", system-ui' }}
          >
            No ICP captured yet
          </h2>
          <p className="text-[12.5px] text-slate-500 dark:text-[#7a8ba3] mt-1.5">
            Go back to the previous step and walk through the chat to build your ICP.
            {loadError ? ` (${loadError})` : ''}
          </p>
          <button
            onClick={onBack}
            className="mt-5 h-10 px-4 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-1.5"
            style={{ background: '#0B1957' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to ICP chat
          </button>
        </div>
      </div>
    );
  }

  const sizeFrom = icp.company.size_employees?.min ?? '';
  const sizeTo = icp.company.size_employees?.max ?? '';

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-5">
        <h1
          className="text-[22px] font-bold text-[#1e293b] dark:text-white"
          style={{ fontFamily: '"Space Grotesk", system-ui' }}
        >
          Review your ICP
        </h1>
        <p className="text-[12.5px] text-slate-500 dark:text-[#7a8ba3] mt-1">
          We extracted these from your chat. Tweak anything that doesn&apos;t look right.
        </p>
      </div>

      <div className="space-y-5">
        {/* Industries */}
        <Section title="Industries" hint="Companies in these industries match. Excluded ones are filtered out.">
          <IndustryChipInput
            value={icp.company.industries ?? []}
            onChange={(v) => updateCompany('industries', v)}
            placeholder="e.g. B2B SaaS, Healthtech"
            suggestions={['B2B SaaS', 'Fintech', 'Healthtech', 'E-commerce', 'Manufacturing']}
          />
        </Section>

        {/* Company size */}
        <Section title="Company size">
          <div className="flex items-center gap-2 text-[13px] text-[#172560] dark:text-white">
            <span>From</span>
            <input
              type="number"
              min={0}
              value={sizeFrom}
              onChange={(e) =>
                updateCompany('size_employees', {
                  ...icp.company.size_employees,
                  min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-24 h-9 px-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
            />
            <span>to</span>
            <input
              type="number"
              min={0}
              value={sizeTo}
              onChange={(e) =>
                updateCompany('size_employees', {
                  ...icp.company.size_employees,
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-24 h-9 px-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
            />
            <span className="text-[12px] text-slate-500 dark:text-[#7a8ba3]">employees</span>
          </div>
        </Section>

        {/* Countries */}
        <Section title="Countries" hint="Geographies to target. Quick-add MENA + global below.">
          <CountryDropdown
            value={icp.company.countries ?? []}
            onChange={(v) => updateCompany('countries', v)}
          />
        </Section>

        {/* Seniorities */}
        <Section title="Seniorities" hint="Which decision-maker levels are in your ICP.">
          <SeniorityPillSelect
            value={icp.person.seniorities ?? []}
            onChange={(v) => updatePerson('seniorities', v)}
          />
        </Section>

        {/* Job titles */}
        <Section title="Job titles" hint="Free text. Partial matches are OK.">
          <IndustryChipInput
            value={icp.person.job_titles_includes ?? []}
            onChange={(v) => updatePerson('job_titles_includes', v)}
            placeholder="e.g. Head of Growth, VP Marketing"
            tone="#0a66c2"
          />
        </Section>

        {/* Advanced */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="text-[12.5px] font-semibold inline-flex items-center gap-1"
          style={{ color: '#0B1957' }}
        >
          {advancedOpen ? '▾' : '▸'} Advanced
        </button>

        {advancedOpen && (
          <div className="space-y-5 pt-1">
            <Section title="Fit threshold" hint="Skip prospects scoring below this.">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(minFit * 100)}
                  onChange={(e) => setMinFit(Number(e.target.value) / 100)}
                  className="flex-1 accent-[#0B1957]"
                />
                <span className="text-[12px] tabular-nums font-semibold text-[#172560] dark:text-white w-12 text-right">
                  {minFit.toFixed(2)}
                </span>
              </div>
            </Section>

            <Section title="Daily cap" hint="Hard limit on new prospects discovered per day.">
              <input
                type="number"
                min={1}
                max={5000}
                value={dailyCap}
                onChange={(e) => setDailyCap(Math.max(1, Number(e.target.value)))}
                className="w-28 h-9 px-2 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
              />
            </Section>

            <Section title="Fit weights" hint="Bias the scorer toward the signals that matter for you.">
              <FitWeightsSliders
                value={fitWeights}
                onChange={(v) => setIcp((prev) => (prev ? { ...prev, fit_weights: v } : prev))}
              />
            </Section>

            <Section title="Discovery backends" hint="Where Mr LAD looks for new prospects.">
              <DiscoveryBackendsToggle
                strategy={icp.search_strategy}
                onChange={(v) => setIcp((prev) => (prev ? { ...prev, search_strategy: v } : prev))}
              />
            </Section>
          </div>
        )}

        {saveError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-[12px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="h-10 px-3.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#0B1957' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save & continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Section({
  title, hint, children,
}: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#000724] rounded-2xl border border-slate-200 dark:border-[#262831] p-4">
      <header className="mb-3">
        <h3
          className="text-[13.5px] font-semibold text-[#172560] dark:text-white"
          style={{ fontFamily: '"Space Grotesk", system-ui' }}
        >
          {title}
        </h3>
        {hint && <p className="text-[11.5px] text-slate-500 dark:text-[#7a8ba3] mt-0.5">{hint}</p>}
      </header>
      {children}
    </div>
  );
}
