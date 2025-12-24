'use client';

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import CampaignsList from '../../features/campaigns/components/CampaignsList';

/**
 * Campaigns Page - follows LAD architecture pattern
 * 
 * This page is a minimal wrapper that handles:
 * - Authentication check
 * - Route-level concerns
 * - Imports feature component from features/campaigns/
 * 
 * All business logic, state management, and UI rendering
 * is in the CampaignsList feature component.
 */
export default function CampaignsPage() {
  // TODO: Add authentication check when auth system is available
  // const session = await getServerSession();
  // if (!session) {
  //   redirect('/login');
  // }

  return (
    <Suspense fallback={<div>Loading campaigns...</div>}>
      <CampaignsList />
    </Suspense>
  );
}

