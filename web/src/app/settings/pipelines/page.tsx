'use client';

/**
 * /settings/pipelines — kept so bookmarks and old links still work. The
 * pipelines live in the Tenant Studio's Pipelines room now.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { PIPELINES_ROOM_HREF } from '@/components/studio/PipelinesRoom';

export default function PipelinesSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(PIPELINES_ROOM_HREF);
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Opening your pipelines…
    </div>
  );
}
