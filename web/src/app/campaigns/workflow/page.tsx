'use client';
// /campaigns/workflow - thin route wrapper around the embeddable
// CustomWorkflowBuilder (also opened in-place from the advanced-search-ai
// "+" menu). Closing from this route returns to the campaigns list.

import * as React from 'react';
import { useRouter } from 'next/navigation';
import CustomWorkflowBuilder from '@/components/campaigns/CustomWorkflowBuilder';

export const dynamic = 'force-dynamic';

export default function CustomWorkflowPage() {
  const router = useRouter();
  return (
    <div className="h-screen">
      <CustomWorkflowBuilder onClose={() => router.push('/campaigns')} />
    </div>
  );
}
