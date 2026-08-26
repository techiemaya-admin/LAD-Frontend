'use client';
// /crm/zoho - Browse Zoho CRM records (Contacts / Leads / Deals / Tasks) synced
// into this tenant. Connection setup lives in Settings → Integrations.

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZohoRecordsBrowser } from '@/components/crm/ZohoRecordsBrowser';
import { ZohoAutomationsPanel } from '@/components/crm/ZohoAutomationsPanel';
import { RecurringZohoCampaignModal } from '@/components/crm/RecurringZohoCampaignModal';

export const dynamic = 'force-dynamic';

export default function ZohoCrmPage() {
  const [showRecurring, setShowRecurring] = React.useState(false);
  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724]">
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white mb-4 transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" /> Back to CRM
        </Link>
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-red-600 select-none leading-none" aria-label="Zoho">Z</span>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-[#1e293b] dark:text-white"
                style={{ fontFamily: '"Space Grotesk", system-ui' }}
              >
                Zoho CRM
              </h1>
              <p className="text-[13px] text-[#6b7280] dark:text-[#7a8ba3]">
                Contacts, Leads, Deals, and Tasks synced from your Zoho CRM
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRecurring(true)}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium border border-slate-200 dark:border-blue-950/40 text-white bg-primary hover:bg-primary/90 transition-all shadow-xs ml-auto"
          >
            <Repeat className="h-4 w-4 text-white" /> Recurring campaign
          </button>
        </div>
        <div className="space-y-4">
          <ZohoAutomationsPanel />
          <ZohoRecordsBrowser />
        </div>
      </main>
      <RecurringZohoCampaignModal open={showRecurring} onClose={() => setShowRecurring(false)} />
    </div>
  );
}
