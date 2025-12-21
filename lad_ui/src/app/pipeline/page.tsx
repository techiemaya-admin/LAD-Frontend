"use client";
import React, { JSX } from 'react';
import { PipelineBoard } from '../../components/pipeline';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Force dynamic rendering for this page due to Redux usage
export const dynamic = 'force-dynamic';

export default function PipelinePage(): JSX.Element {
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authed) return <></>;

  return (
    <div className="p-4">
      <PipelineBoard />
    </div>
  );
}
