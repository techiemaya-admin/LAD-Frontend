'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import nextDynamic from 'next/dynamic';
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SettingsContent = nextDynamic(
  () => import('./SettingsContent'),
  {
    loading: () => (
      <>
        <PageLoadingSentry />
        <SettingsSkeleton />
      </>
    )
  }
);

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        const redirect = encodeURIComponent('/settings');
        router.replace(`/login?redirect_url=${redirect}`);
      }
    })();
  }, [router]);

  if (authed === null) {
    return (
      <>
        <PageLoadingSentry />
        <SettingsSkeleton />
      </>
    );
  }

  if (!authed) return <></>;

  return <SettingsContent />;
};

export default SettingsPage;
