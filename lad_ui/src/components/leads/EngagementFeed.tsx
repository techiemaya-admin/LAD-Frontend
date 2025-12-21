import React from 'react';
import {
  Monitor,
  HeartHandshake,
  Smartphone,
  Store,
  ChevronRight,
} from 'lucide-react';
import type { Lead } from './types';

type FeedItem = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  date: string;
};

type EngagementFeedCardProps = {
  lead?: Lead | null;
};

const feedItems: FeedItem[] = [
  {
    icon: Monitor,
    title: 'Website Visit',
    subtitle: 'Running Time',
    date: 'May 17,2025 - 02:37 PM',
  },
  {
    icon: HeartHandshake,
    title: 'Loyalty Account Created',
    date: 'May 15,2025 - 07:43 PM',
  },
  {
    icon: Monitor,
    title: 'Website Visit',
    subtitle: 'Collecting Pages',
    date: 'May 16,2025 - 04:04 PM',
  },
  {
    icon: Smartphone,
    title: 'Mobile App Visit',
    subtitle: 'Viewed NTO Maps',
    date: 'May 15,2025 - 03:54 PM',
  },
  {
    icon: Store,
    title: 'In Store',
    subtitle: 'Online Exclusive',
    date: 'May 14,2025 - 10:37 AM',
  },
  {
    icon: Smartphone,
    title: 'Mobile App Visit',
    subtitle: 'Viewed NTO Maps',
    date: 'May 12,2025 - 11:37 AM',
  },
];

const EngagementFeedCard: React.FC<EngagementFeedCardProps> = ({ lead }) => {
  return (
    <div 
      className="flex h-full w-full flex-col rounded-3xl p-5"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 10px 60px 0px #E2ECF980'
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
          <img src="https://cdn-icons-png.flaticon.com/512/1205/1205501.png" alt="feed" className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Engagement Feed</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3.5">
          {feedItems.map(({ icon: Icon, title, subtitle, date }) => (
            <div
              key={`${title}-${date}`}
              className="group rounded-2xl border border-transparent bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-indigo-50"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 text-slate-300">
                  <ChevronRight className="h-4 w-4" />
                </span>
                <div className="relative flex-1 pl-3">
                  <div className="absolute left-1 top-6 h-9 w-px bg-slate-200" aria-hidden />
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{title}</p>
                      {subtitle && <p className="text-xs font-medium text-slate-500">{subtitle}</p>}
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{date}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EngagementFeedCard;







