'use client';

/**
 * StudioLaunchBanner — the one amber line on the dashboard while something
 * still blocks the first campaign from sending.
 *
 * Keys on `state.launch` (the cheap verdict the studio state carries); the
 * backend decides what blocks, this only names the rows. Renders nothing
 * when setup is complete, when nothing blocks, or when the backend does not
 * report `launch` at all (not reported ≠ blocked). A studio that fails to
 * load also renders nothing — the dashboard must not depend on it.
 */
import Link from 'next/link';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { useStudioState } from '@lad/frontend-features/tenant-studio';
import { BANNER, LINK, TINT } from './studio-theme';

/** Plain names for the launch rows, by key, in the backend's order. */
export const LAUNCH_ROW_TITLES: Record<string, string> = {
  company: 'Company and sender',
  offering: 'What you sell',
  audience: 'Who to reach',
  channel: 'A channel ready',
  campaign: 'First campaign',
  credits: 'Credits',
  goals: 'Goals',
  references: 'References',
};

export function launchRowTitle(key: string): string {
  return LAUNCH_ROW_TITLES[key] ?? key.replace(/_/g, ' ');
}

export default function StudioLaunchBanner({ className = '' }: { className?: string }) {
  const state = useStudioState();
  const data = state.data;
  if (!data?.launch || !data.setup) return null;
  if (data.setup.completedAt !== null || data.launch.completedAt) return null;
  const blocking = data.launch.blocking;
  if (blocking.length === 0) return null;
  const titles = blocking.map(launchRowTitle);
  return (
    <div className={`flex flex-col gap-2 ${BANNER.base} ${BANNER.warn} sm:flex-row sm:items-center sm:justify-between ${className}`} role="status" data-testid="studio-launch-banner">
      <span className="flex items-start gap-2">
        <CircleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${TINT.warn}`} aria-hidden />
        <span>
          {blocking.length} thing{blocking.length === 1 ? '' : 's'} before your first campaign can send: {titles.join(', ')} (about 1 min each).
        </span>
      </span>
      <Link href="/studio" className={`inline-flex shrink-0 items-center gap-1 ${LINK}`}>
        Finish setup<ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
