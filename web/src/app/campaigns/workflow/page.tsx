'use client';
// /campaigns/workflow - thin route wrapper around the embeddable
// CustomWorkflowBuilder (also opened in-place from the advanced-search-ai
// "+" menu). Closing from this route returns to the campaigns list.
//
// `?from=studio-first-campaign`: the Tenant Studio's Step 7 hand-off. The
// draft it wrote (GET /api/snapshot/studio/first-campaign) lands on the
// canvas as `initialAiTemplate`, and a launch from here is recorded back on
// the draft (PUT { launchedCampaignId }) so the studio shows it as live.
// `&autoLaunch=1` (Step 9's Go live): the builder presses Launch itself once
// the draft is on the canvas, and the tenant lands back on the studio rooms
// with a "You're live" banner instead of the campaigns list.

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import CustomWorkflowBuilder from '@/components/campaigns/CustomWorkflowBuilder';
import { useFirstCampaign, useUpdateFirstCampaign } from '@lad/frontend-features/tenant-studio';

export const dynamic = 'force-dynamic';

// Only Next's own exports are allowed from a page module, so this stays local.
const STUDIO_FIRST_CAMPAIGN_FROM = 'studio-first-campaign';
const STUDIO_LIVE_HREF = '/studio?live=1';

function WorkflowRoute() {
  const router = useRouter();
  const params = useSearchParams();
  const fromStudio = params.get('from') === STUDIO_FIRST_CAMPAIGN_FROM;
  const autoLaunch = fromStudio && params.get('autoLaunch') === '1';
  const draft = useFirstCampaign(fromStudio);
  const markLaunched = useUpdateFirstCampaign();
  // `count` is "people this week"; the builder's only knob is leads per day.
  // Memoised: the builder applies a NEW template object to the canvas.
  const draftData = draft.data;
  const template = React.useMemo(
    () => (fromStudio && draftData?.template?.nodes?.length
      ? { ...draftData.template, perDay: Math.max(1, Math.ceil((draftData.count || 50) / 7)) }
      : undefined),
    [fromStudio, draftData],
  );

  if (fromStudio && draft.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your first campaign…
      </div>
    );
  }

  const warnings = !fromStudio
    ? undefined
    : draft.data === undefined
      ? ['Your first campaign draft could not be loaded. Starting from a blank canvas; go back to the studio to try again.']
      : draft.data === null || !template
        ? ['No first campaign draft was found. Draft one in the studio, or build from scratch here.']
        : draft.data.status === 'launched'
          ? ['This draft was already launched. Launching again creates a second campaign.']
          : undefined;

  return (
    <div className="h-screen">
      <CustomWorkflowBuilder
        onClose={() => router.push(fromStudio ? '/studio' : '/campaigns')}
        initialAiTemplate={template}
        initialAiWarnings={warnings}
        onLaunched={fromStudio && template ? async (campaignId) => { await markLaunched.mutateAsync({ launchedCampaignId: campaignId }); } : undefined}
        autoLaunch={autoLaunch && Boolean(template) && draft.data?.status !== 'launched'}
        afterLaunchHref={autoLaunch ? STUDIO_LIVE_HREF : undefined}
      />
    </div>
  );
}

export default function CustomWorkflowPage() {
  return (
    <React.Suspense fallback={<div className="h-screen" />}>
      <WorkflowRoute />
    </React.Suspense>
  );
}
