"use client";
import React, { JSX } from 'react';
import { PipelineBoard } from '@/components/deals-pipeline';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, TrendingUp } from 'lucide-react';
import PipelineStatsCards from '@/components/deals-pipeline/PipelineStatsCards';
import { useSelector } from 'react-redux';
import { usePipelineStats } from '@lad/frontend-features/deals-pipeline';
import { selectPipelineActiveFilters } from '@/store/slices/uiSlice';

// Force dynamic rendering for this page due to Redux/Hooks usage
export const dynamic = 'force-dynamic';

export default function PipelinePage(): JSX.Element {
  const { hasFeature, user, isAuthenticated } = useAuth();
  const activeFilters = useSelector(selectPipelineActiveFilters);

  // Fetch real-time statistics using the SDK hook
  // passing current filters ensures stats stay in sync with board filtering
  const { data: stats, isLoading } = usePipelineStats(activeFilters as any);
  debugger
  // Determine if this is education vertical (only after user is loaded)
  const isEducation = isAuthenticated && user ? hasFeature('education_vertical') : false;

  // Dynamic labels based on vertical
  const labels = {
    title: isEducation ? 'Students Pipeline' : 'Deals Pipeline',
    subtitle: isEducation ? 'Manage student admissions and counseling' : 'Manage your leads and deals',
    icon: isEducation ? GraduationCap : TrendingUp
  };

  // Map backend stats to Card props
  // Handle both snake_case and camelCase from normalized SDK response
  const totalLeads = Number(stats?.total_leads ?? stats?.totalLeads ?? 0);
  const stageStats = stats?.leads_by_stage || {};
  
  // Extract specific counts needed for the cards
  const connectionSentCount = Number(stats?.connectionsSent ?? stageStats['connection sent'] ?? 0);
  const messageSentCount = Number(stats?.messagesSent ?? stageStats['message sent'] ?? 0);
  
  // Success count mapping (aliased to connectionAcceptedCount in UI cards)
  const successCount = Number(stats?.successRate ?? stats?.leads_converted ?? stageStats['success'] ?? 0);

  return (
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-6 mt-10">
        <div className="flex items-center gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-[#1e293b]">{labels.title}</h1>
            <p className="text-[#6b7280]">{labels.subtitle}</p>
          </div>
        </div>

        <PipelineStatsCards
          loading={isLoading}
          totalLeads={totalLeads}
          connectionSentCount={connectionSentCount}
          connectionAcceptedCount={successCount}
          messageSentCount={messageSentCount}
        />
      </div>

      <PipelineBoard />
    </div>
  );
}
