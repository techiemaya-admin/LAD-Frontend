'use client';
// R8 Phase 3 - Integrations step. Placeholder grid that links to the
// channel-connection pages. The real connect flow lives outside the wizard
// (LinkedIn / WhatsApp / Email each have their own pages), so this step just
// surfaces the entry points and lets the tenant finish later.

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, MessageCircle, Mail, Phone, Camera,
  type LucideIcon,
} from 'lucide-react';

interface IntegrationItem {
  key: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  color: string;
  href: string;
}

const ITEMS: IntegrationItem[] = [
  { key: 'linkedin',  label: 'LinkedIn',  desc: 'Connect Sales Nav for prospecting',  Icon: BriefcaseBusiness, color: '#0a66c2', href: '/settings' },
  { key: 'whatsapp',  label: 'WhatsApp',  desc: 'WABA setup for two-way conversations', Icon: MessageCircle,    color: '#22c55e', href: '/settings' },
  { key: 'email',     label: 'Email',     desc: 'Connect Gmail / Outlook sender',     Icon: Mail,              color: '#ea4335', href: '/settings' },
  { key: 'voice',     label: 'Voice',     desc: 'LiveKit + Vonage voice agent',       Icon: Phone,             color: '#7c3aed', href: '/phone-numbers' },
  { key: 'instagram', label: 'Instagram', desc: 'Inbound replies + DMs',              Icon: Camera,            color: '#ec4899', href: '/instagram' },
];

interface WizardIntegrationsStepProps {
  onBack: () => void;
  onContinue: () => void;
}

export default function WizardIntegrationsStep({ onBack, onContinue }: WizardIntegrationsStepProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1
        className="text-[22px] font-bold text-[#1e293b] dark:text-white"
        style={{ fontFamily: '"Space Grotesk", system-ui' }}
      >
        Connect your channels
      </h1>
      <p className="text-[12.5px] text-slate-500 dark:text-[#7a8ba3] mt-1">
        Pick the channels you&apos;ll use. You can skip and come back to any of these later.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITEMS.map((it) => {
          const Icon = it.Icon;
          return (
            <Link
              key={it.key}
              href={it.href}
              className="rounded-xl border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] p-4 flex items-center gap-3 hover:border-[#0B1957]/40 hover:shadow-sm transition"
            >
              <div
                className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
                style={{ background: `${it.color}1a`, color: it.color }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[#172560] dark:text-white">{it.label}</p>
                <p className="text-[12px] text-slate-500 dark:text-[#7a8ba3] truncate">{it.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="h-10 px-3.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onContinue}
          className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition"
          style={{ background: '#0B1957' }}
        >
          Finish & go to dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
