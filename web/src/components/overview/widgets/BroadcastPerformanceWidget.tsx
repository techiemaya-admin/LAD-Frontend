"use client";
/**
 * BroadcastPerformanceWidget
 * --------------------------
 * Dashboard-overview widget wrapper around <BroadcastPerformanceContainer/>.
 * The container handles its own data fetch (GET /api/whatsapp-conversations/
 * broadcasts/template-stats); we just slot it into the standard widget chrome
 * (`WidgetWrapper`) with `chromeless` so the inner card/title don't duplicate
 * the wrapper's.
 *
 * Surface: rendered on /overview for all tenants — appears in every default
 * dashboard layout and is migrated onto existing user layouts via the persist
 * migration in `dashboardStore.ts`.
 */
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { BroadcastPerformanceContainer } from '@/features/community-roi/components/BroadcastPerformanceContainer';

interface BroadcastPerformanceWidgetProps {
  id: string;
}

export const BroadcastPerformanceWidget: React.FC<BroadcastPerformanceWidgetProps> = ({ id }) => {
  return (
    <WidgetWrapper
      id={id}
      title="Broadcast Performance"
      icon={<MessageSquare className="h-4 w-4" />}
    >
      <BroadcastPerformanceContainer chromeless />
    </WidgetWrapper>
  );
};

export default BroadcastPerformanceWidget;
