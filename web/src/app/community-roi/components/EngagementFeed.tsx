'use client';

import React from 'react';
import { useMemberRecentActivity } from '@lad/frontend-features/community-roi';
import { format, parseISO } from 'date-fns';
import { Users, Send, Calendar, ArrowRight } from 'lucide-react';

interface EngagementFeedProps {
  memberId: string;
}

export const EngagementFeed: React.FC<EngagementFeedProps> = ({ memberId }) => {
  const { activity, isLoading } = useMemberRecentActivity(memberId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">No recent engagement recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Engagement Feed</h3>
        <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="relative space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
        {activity.map((item: any) => (
          <div key={item.id} className="relative flex gap-4 items-start group">
            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
              item.type === 'meeting' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {item.type === 'meeting' ? (
                <Users className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </div>
            
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {item.type === 'meeting' ? (
                    <>Meeting with <span className="text-primary">{item.related_member_name}</span></>
                  ) : (
                    <>Referred to <span className="text-primary">{item.related_member_name}</span></>
                  )}
                </p>
                <time className="text-[11px] text-gray-400 font-medium whitespace-nowrap ml-2">
                  {format(parseISO(item.created_at), 'MMM dd, h:mm a')}
                </time>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1 italic">
                {item.details || (item.type === 'meeting' ? 'One-to-one interaction' : 'Business referral')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
