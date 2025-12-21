/**
 * Next Best Actions Component
 *
 * Presents a short list of AI-guided actions for advancing a lead. The layout
 * uses Tailwind utility classes (with shadcn-inspired tokens) and lucide-react
 * icons to stay consistent with the design system while remaining lightweight.
 */

import React from 'react';
import {
  Star,
  ThumbsUp,
  Crosshair,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';

type Action = {
  icon: LucideIcon;
  text: string;
};

const actions: Action[] = [
  {
    icon: ThumbsUp,
    text: 'Connect in person to establish strong relationship',
  },
  {
    icon: Crosshair,
    text: 'Promote targeted Google Ads',
  },
  {
    icon: FileText,
    text: 'Share a relevant case study or testimonial',
  },
  {
    icon: ImageIcon,
    text: 'Offer a free trial or demo',
  },
];

const NextBestActionsCard: React.FC = () => {
  return (
    <div 
      className="w-full rounded-2xl p-6 font-sans"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 10px 60px 0px #E2ECF980'
      }}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
          <Star className="h-5 w-5 text-slate-800" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Next Best Actions</h2>
      </div>

      <div className="flex flex-col gap-3">
        {actions.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="group flex items-start gap-3 rounded-xl border border-transparent bg-slate-50 p-4 transition duration-200 hover:-translate-x-1 hover:border-indigo-100 hover:bg-indigo-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-900 shadow-sm">
              <Icon className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <p className="flex-1 text-sm font-medium leading-relaxed text-slate-700">
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextBestActionsCard;