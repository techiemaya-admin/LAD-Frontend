"use client";
import React, { JSX, useCallback, useEffect, useState } from 'react';
import { PipelineBoard } from '@/components/deals-pipeline';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, TrendingUp } from 'lucide-react';
import PipelineStatsCards from '@/components/deals-pipeline/PipelineStatsCards';
import { useDispatch, useSelector } from 'react-redux';
import { usePipelineStats } from '@lad/frontend-features/deals-pipeline';
import { selectPipelineActiveFilters, setPipelineActiveFilters } from '@/store/slices/uiSlice';

// Force dynamic rendering for this page due to Redux/Hooks usage
export const dynamic = 'force-dynamic';

export default function PipelinePage(): JSX.Element {
  const { hasFeature, user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const activeFilters = useSelector(selectPipelineActiveFilters);

  const [stage, setStage] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleStatsCardClick = useCallback((cardKey: string) => {
    // Toggle: if clicking the same card, deselect it
    const newSelectedCard = selectedCard === cardKey ? null : cardKey;
    setSelectedCard(newSelectedCard);

    if (cardKey === 'total' || newSelectedCard === null) {
      setStage(undefined);
      setStatus(undefined);
      dispatch(
        setPipelineActiveFilters({
          ...(activeFilters as any),
          stages: [],
          statuses: [],
        })
      );
      setPage(1);
      return;
    }

    if (cardKey === 'connection_sent') {
      setStage('connection_sent');
      setStatus(undefined);
      dispatch(
        setPipelineActiveFilters({
          ...(activeFilters as any),
          stages: ['connection_sent'],
          statuses: [],
        })
      );
      setPage(1);
      return;
    }

    if (cardKey === 'message_sent') {
      setStage('message');
      setStatus('sent');
      dispatch(
        setPipelineActiveFilters({
          ...(activeFilters as any),
          stages: ['message'],
          statuses: ['sent'],
        })
      );
      setPage(1);
      return;
    }

    if (cardKey === 'followup') {
      setStage('followup');
      setStatus(undefined);
      dispatch(
        setPipelineActiveFilters({
          ...(activeFilters as any),
          stages: ['followup'],
          statuses: [],
        })
      );
      setPage(1);
      return;
    }

    if (cardKey === 'contacted') {
      setStage('contacted');
      setStatus(undefined);
      dispatch(
        setPipelineActiveFilters({
          ...(activeFilters as any),
          stages: ['contacted'],
          statuses: [],
        })
      );
      setPage(1);
    }
  }, [activeFilters, dispatch, selectedCard]);

  // Fetch real-time statistics using the SDK hook
  // passing current filters ensures stats stay in sync with board filtering
  const { data: stats, isLoading } = usePipelineStats(activeFilters as any);
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
  
  // Contacted count from API response
  const contactedCount = Number(stats?.contacted ?? 0);

  return (
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-6 mt-10">
        <div className="flex items-center gap-3 mb-5">
          <labels.icon className="w-8 h-8 text-[#1e293b]" />
          <div>
            <h1 className="text-3xl font-bold text-[#1e293b]">{labels.title}</h1>
            <p className="text-[#6b7280]">{labels.subtitle}</p>
          </div>
        </div>

        <PipelineStatsCards
          loading={isLoading}
          totalLeads={totalLeads}
          connectionSentCount={connectionSentCount}
          contacted={contactedCount}
          messageSentCount={messageSentCount}
          onCardClick={handleStatsCardClick}
          selectedCard={selectedCard}
        />
      </div>

      <PipelineBoard
        stage={stage}
        status={status}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit: number) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />
    </div>
  );
}
