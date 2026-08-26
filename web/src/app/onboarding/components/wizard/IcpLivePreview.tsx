'use client';
// R8 Phase 3 redesign - right column of the ICP discovery split layout. Reads
// the in-progress IcpStructured and renders each filled field as chips/pills/
// range so the tenant sees their ICP take shape as they answer.

import * as React from 'react';
import { Sparkles, Globe2, Building2, Users, Briefcase, Layers, Radio } from 'lucide-react';
import type { IcpStructured } from '@lad/frontend-features/ai-icp-assistant';

const SENIORITY_LABEL: Record<string, string> = {
  c_level: 'C-Level',
  vp: 'VP',
  director: 'Director',
  head: 'Head',
  manager: 'Manager',
  senior_ic: 'Senior IC',
  ic: 'IC',
};

const CHANNEL_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  email: 'Email',
  whatsapp: 'WhatsApp',
  voice: 'Voice',
  instagram: 'Instagram',
};

interface IcpLivePreviewProps {
  icp: IcpStructured;
  progressPct: number;
  answeredCount: number;
  totalCount: number;
}

export default function IcpLivePreview({
  icp, progressPct, answeredCount, totalCount,
}: IcpLivePreviewProps) {
  const sizeRange = icp.company.size_employees;
  const sizeLabel = sizeRange
    ? sizeRange.min != null && sizeRange.max != null
      ? `${sizeRange.min}-${sizeRange.max}`
      : sizeRange.min != null
      ? `${sizeRange.min}+`
      : sizeRange.max != null
      ? `up to ${sizeRange.max}`
      : null
    : null;

  return (
    <aside className="h-full w-full flex flex-col bg-white dark:bg-[#000724] border-l border-slate-200 dark:border-[#262831]">
      <header
        className="px-6 py-5 border-b border-slate-100 dark:border-[#262831]"
        style={{ background: 'linear-gradient(135deg, #f0f3ff 0%, #e8ecfa 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl grid place-items-center"
            style={{ background: 'linear-gradient(135deg, #0B1957, #1a3a8f)' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[15px] font-bold text-[#111827] dark:text-white"
              style={{ fontFamily: '"Space Grotesk", system-ui' }}
            >
              Your ICP
            </h2>
            <p className="text-[11.5px] text-[#0B1957] font-medium">
              {progressPct === 100 ? 'Ready to review' : `${answeredCount}/${totalCount} answered`}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#dce3f5' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background:
                progressPct === 100
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : 'linear-gradient(90deg, #0B1957, #1a3a8f)',
            }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <Section icon={Building2} title="Industries">
          {(icp.company.industries?.length ?? 0) > 0 ? (
            <ChipRow values={icp.company.industries!} tone="#0B1957" />
          ) : (
            <Hint>Not set yet</Hint>
          )}
        </Section>

        <Section icon={Globe2} title="Countries">
          {(icp.company.countries?.length ?? 0) > 0 ? (
            <ChipRow values={icp.company.countries!} tone="#0ea5e9" />
          ) : (
            <Hint>Not set yet</Hint>
          )}
        </Section>

        <Section icon={Layers} title="Company size">
          {sizeLabel ? (
            <p className="text-[13px] font-semibold text-[#172560] dark:text-white tabular-nums">
              {sizeLabel}
              <span className="text-[11.5px] font-medium text-slate-500 dark:text-[#7a8ba3] ml-1">employees</span>
            </p>
          ) : (
            <Hint>Not set yet</Hint>
          )}
        </Section>

        <Section icon={Users} title="Seniorities">
          {(icp.person.seniorities?.length ?? 0) > 0 ? (
            <ChipRow
              values={icp.person.seniorities!.map((s) => SENIORITY_LABEL[s] ?? s)}
              tone="#7c3aed"
            />
          ) : (
            <Hint>Not set yet</Hint>
          )}
        </Section>

        <Section icon={Briefcase} title="Job titles">
          {(icp.person.job_titles_includes?.length ?? 0) > 0 ? (
            <ChipRow values={icp.person.job_titles_includes!} tone="#0a66c2" />
          ) : (
            <Hint>Not set yet</Hint>
          )}
        </Section>

        {(icp.person.departments?.length ?? 0) > 0 && (
          <Section icon={Layers} title="Departments">
            <ChipRow values={icp.person.departments!} tone="#64748b" />
          </Section>
        )}

        <Section icon={Radio} title="Outreach channels">
          {(icp.outreach_preferences?.preferred_channels?.length ?? 0) > 0 ? (
            <ChipRow
              values={icp.outreach_preferences!.preferred_channels!.map((c) => CHANNEL_LABEL[c] ?? c)}
              tone="#22c55e"
            />
          ) : (
            <Hint>Not set yet</Hint>
          )}
        </Section>

        {icp.fit_weights && (
          <Section icon={Sparkles} title="Fit weights">
            <div className="space-y-1.5">
              {Object.entries(icp.fit_weights).map(([k, v]) => (
                <WeightRow key={k} label={prettifyKey(k)} value={(v as number) ?? 0} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </aside>
  );
}

function prettifyKey(k: string): string {
  return k
    .replace('_match', '')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function Section({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-[#7a8ba3]" />
        <h3
          className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-500 dark:text-[#7a8ba3]"
        >
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function ChipRow({ values, tone }: { values: string[]; tone: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium"
          style={{ background: `${tone}1f`, color: tone }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

function WeightRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-600 dark:text-[#7a8ba3] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8ebf7' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: '#0B1957' }} />
      </div>
      <span className="text-[11px] tabular-nums font-semibold text-[#172560] dark:text-white w-7 text-right">
        {pct}
      </span>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] text-slate-400 dark:text-[#7a8ba3]/70 italic">{children}</p>
  );
}
