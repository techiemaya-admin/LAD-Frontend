"use client";
import React, { JSX } from 'react';
import { PipelineBoard } from '@/components/deals-pipeline';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, TrendingUp } from 'lucide-react';
import { PipelineSkeleton } from '@/components/skeletons';
import PipelineStatsCards from '@/components/deals-pipeline/PipelineStatsCards';
import { useSelector } from 'react-redux';
import { selectPipelineBoardDataWithFilters } from '@/features/deals-pipeline/store/selector/pipelineSelectors';

// Force dynamic rendering for this page due to Redux usage
export const dynamic = 'force-dynamic';

export default function PipelinePage(): JSX.Element {
  const router = useRouter();
  const { hasFeature, user, isAuthenticated } = useAuth();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const pipelineBoardData = useSelector(selectPipelineBoardDataWithFilters);

  // Determine if this is education vertical (only after user is loaded)
  const isEducation = isAuthenticated && user ? hasFeature('education_vertical') : false;

  // Dynamic labels based on vertical
  const labels = {
    title: isEducation ? 'Students Pipeline' : 'Deals Pipeline',
    subtitle: isEducation ? 'Manage student admissions and counseling' : 'Manage your leads and deals',
    icon: isEducation ? GraduationCap : TrendingUp
  };

  useEffect(() => {
    (async () => {    
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        const redirect = encodeURIComponent('/pipeline');
        router.replace(`/login?redirect_url=${redirect}`);
      }
    })();
  }, [router]);

  if (authed === null) {
    return <PipelineSkeleton />;
  }

  if (!authed) return <></>;

  const IconComponent = labels.icon;

  const stageCounts = (pipelineBoardData?.stages || []).reduce((acc: Record<string, number>, stage: any) => {
    const label = String(stage?.label || stage?.name || stage?.key || '').toLowerCase();
    const count = stage?.leadCount ?? stage?.leads?.length ?? 0;
    if (label) acc[label] = (acc[label] || 0) + count;
    return acc;
  }, {});

  const connectionSentCount = stageCounts['connection sent'] || 0;
  const connectionAcceptedCount = stageCounts['connection accepted'] || 0;
  const messageSentCount = stageCounts['message sent'] || 0;
  const totalLeads = pipelineBoardData?.totalLeads || 0;

  // Success count: leads with status === 'success'
  const successCount = (pipelineBoardData?.stages || []).reduce((sum, stage) => {
    const successLeads = (stage.leads || []).filter((lead: any) => lead.status === 'success');
    return sum + successLeads.length;
  }, 0);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {/* <IconComponent className="h-8 w-8 text-blue-600" /> */}
          <div>
            <h1 className="text-3xl font-bold text-[#1e293b]">{labels.title}</h1>
            <p className="text-[#6b7280]">{labels.subtitle}</p>
          </div>
        </div>

        <PipelineStatsCards
          loading={authed === null}
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
