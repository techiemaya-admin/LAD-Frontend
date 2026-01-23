"use client";
import React, { JSX } from 'react';
import { PipelineBoard } from '@/features/deals-pipeline/components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, TrendingUp } from 'lucide-react';
// Force dynamic rendering for this page due to Redux usage
export const dynamic = 'force-dynamic';
export default function PipelinePage(): JSX.Element {
  const router = useRouter();
  const { hasFeature, user, isAuthenticated } = useAuth();
  const [authed, setAuthed] = useState<boolean | null>(null);
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
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!authed) return <></>;
  const IconComponent = labels.icon;
  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <IconComponent className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
            <p className="text-gray-600">{labels.subtitle}</p>
          </div>
        </div>
      </div>
      <PipelineBoard />
    </div>
  );
}