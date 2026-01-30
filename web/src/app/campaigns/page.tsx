'use client';

import React from 'react';
import nextDynamic from 'next/dynamic';
import { CampaignsSkeleton } from '@/components/skeletons/CampaignsSkeleton';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

const CampaignsList = nextDynamic(
  () => import('../../features/campaigns/components/CampaignsList'),
  {
    loading: () => (
      <>
        <PageLoadingSentry />
        <CampaignsSkeleton />
      </>
    )
  }
);

/**
 * Campaigns Page - follows LAD architecture pattern
 * 
 * This page is a minimal wrapper that handles:
 * - Authentication check
 * - Route-level concerns
 * - Imports feature component from features/campaigns/
 */
export default function CampaignsPage() {
  return <CampaignsList />;
}