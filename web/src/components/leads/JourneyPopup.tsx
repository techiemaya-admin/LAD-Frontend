import React from 'react';
import {
  CalendarDays,
  Inbox,
  Send,
  UserCircle2,
  X,
} from 'lucide-react';
import { JourneyData, PopupProps } from './types';

// --- MOCK DATA ---
const mockJourneyData: JourneyData = {
    leadId: "24",
    leadName: "Prem Kumar",
    platform: "Facebook",
    avatar: null,
    journey: [
        { id: 1, type: "scraped", date: "2024-01-15" },
        { id: 2, type: "template_sent", date: "2024-01-16" },
        { id: 3, type: "response_received", date: "2024-01-17", details: { responseTime: "19 hours 30 minutes" } },
        { id: 4, type: "follow_up", date: "2024-01-18" },
        { id: 5, type: "qualified", date: "2024-01-19" },
        { id: 6, type: "demo_scheduled", date: "2024-01-25" },
        { id: 7, type: "follow_up", date: "2024-01-26" }
    ]
};

// --- HELPER FUNCTION ---
const formatStepDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const JourneySummaryCard: React.FC<{ data: JourneyData }> = ({ data }) => {
  const scrapedStep = data.journey.find((step) => step.type === 'scraped');
  const templateSentStep = data.journey.find((step) => step.type === 'template_sent');
  const responseReceivedStep = data.journey.find((step) => step.type === 'response_received');

  const keyMetrics = [
    {
      label: 'Lead Scraped',
      value: scrapedStep ? formatStepDate(scrapedStep.date) : 'N/A',
      Icon: CalendarDays,
      tone: 'text-slate-900',
    },
    {
      label: 'Template Sent',
      value: templateSentStep ? formatStepDate(templateSentStep.date) : 'N/A',
      Icon: Send,
      tone: 'text-slate-900',
    },
    {
      label: 'First Response',
      value: responseReceivedStep ? formatStepDate(responseReceivedStep.date) : 'N/A',
      Icon: Inbox,
      tone: 'text-emerald-600',
      details: responseReceivedStep?.details?.responseTime,
    },
  ];

  return (
    <div className="mx-5 mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="border-b border-slate-100 pb-2 text-lg font-semibold text-indigo-700">Key Activity Dates</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {keyMetrics.map(({ label, value, Icon, tone, details }) => (
          <div key={label} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
            </div>
            <p className={`text-sm font-semibold ${tone}`}>{value}</p>
            {details && (
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                Response time: {details}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const JourneyPopup: React.FC<PopupProps> = ({ open, onClose, lead }) => {
  const journeyData = mockJourneyData;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4 bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white/40 bg-white/10">
            <UserCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{journeyData.leadName}</h2>
            <div className="mt-2 flex items-center gap-3 text-xs uppercase tracking-wide text-white/80">
              <span className="rounded-full border border-white/40 px-3 py-1 font-semibold">{journeyData.platform}</span>
              <span>Lead ID: {journeyData.leadId}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 pb-6">
          <JourneySummaryCard data={journeyData} />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JourneyPopup;
