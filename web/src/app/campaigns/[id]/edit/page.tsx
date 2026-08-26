'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Campaign workflow editing now happens in the advanced-search-ai setup flow,
// which reloads the saved chat + config steps for the campaign (?campaignId=<id>)
// and saves via updateCampaign. This route is kept only as a redirect so any
// existing links/bookmarks to /campaigns/[id]/edit still resolve.
export default function CampaignEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  useEffect(() => {
    if (campaignId) {
      router.replace(`/onboarding/advanced-search-ai?campaignId=${campaignId}`);
    }
  }, [campaignId, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
