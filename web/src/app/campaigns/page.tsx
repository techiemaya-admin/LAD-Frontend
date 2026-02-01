'use client';
import { Suspense } from 'react';
import { CampaignsList } from '@/components/campaigns';
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
  return (
    <Suspense fallback={<div>Loading campaigns...</div>}>
      <CampaignsList />
    </Suspense>
  );
}
