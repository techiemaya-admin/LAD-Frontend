'use client';

/**
 * /pipelines — kept so bookmarks and old links still work. The pipelines
 * live in the Tenant Studio's Pipelines room now (one implementation:
 * components/pipelines/PipelineCard + components/studio/PipelinesRoom).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { PIPELINES_ROOM_HREF } from '@/components/studio/PipelinesRoom';

export default function PipelinesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(PIPELINES_ROOM_HREF);
  }, [router]);
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Opening your pipelines…
    </div>
  );
}
