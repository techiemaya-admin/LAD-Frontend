"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import nextDynamic from 'next/dynamic';
import { PipelineSkeleton } from '@/components/skeletons/PipelineSkeleton';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

// Force dynamic rendering for this page due to Redux usage
export const dynamic = 'force-dynamic';

const PipelineContent = nextDynamic(
  () => import('./PipelineContent'),
  {
    loading: () => (
      <>
        <PageLoadingSentry />
        <PipelineSkeleton />
      </>
    )
  }
);

export default function PipelinePage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

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
    return (
      <>
        <PageLoadingSentry />
        <PipelineSkeleton />
      </>
    );
  }

  if (!authed) return <></>;

  return <PipelineContent />;
}
