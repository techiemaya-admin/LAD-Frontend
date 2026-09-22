'use client';

/**
 * SetupShell — the step frame for Tenant Studio's onboarding mode.
 *
 * One header ("Step n of 9"), one progress bar, and a "Save and continue
 * later" action that is ALWAYS visible: it records the step the tenant is on
 * (PUT /api/snapshot/studio/setup) and sends them to the overview, so the
 * next visit to /studio resumes here instead of restarting.
 *
 * Mobile-first: at 390px the header stacks, the action stays in the top-right.
 */
import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useSaveSetup } from '@lad/frontend-features/tenant-studio';
import { AI_GRADIENT, AI_TEXT, SURFACE } from '../studio-theme';

export const SETUP_TOTAL_STEPS = 9;

export interface SetupShellProps {
  step: number;
  title: string;
  children: ReactNode;
  /** Small secondary link under the header (e.g. "Skip to the studio"). */
  aside?: ReactNode;
  /** Progress bar override (0–100); the last step shows 100 rather than "eight of nine done". */
  progress?: number;
}

export default function SetupShell({ step, title, children, aside, progress }: SetupShellProps) {
  const router = useRouter();
  const { toast } = useToast();
  const save = useSaveSetup();
  const pct = progress ?? Math.round((Math.max(0, step - 1) / SETUP_TOTAL_STEPS) * 100);

  const saveAndLeave = () => {
    save.mutate(
      { currentStep: step },
      {
        onSuccess: () => router.push('/overview'),
        onError: () => toast({ title: 'Could not save your progress', description: 'Try again in a moment.', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className={`min-h-full ${SURFACE}`}>
      <div className="mx-auto w-full max-w-[760px] px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <span>Step {step} of {SETUP_TOTAL_STEPS}</span>
                <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
                <span className={`font-semibold ${AI_TEXT}`}>{pct}%</span>
              </p>
              <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-slate-200/80 bg-white/70 backdrop-blur hover:border-[#7C5CFF]/50 dark:border-white/10 dark:bg-white/5"
              onClick={saveAndLeave}
              disabled={save.isPending}
              aria-label="Save and continue later"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Save and continue later</span>
              <span className="sm:hidden">Save for later</span>
            </Button>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={`Setup progress: step ${step} of ${SETUP_TOTAL_STEPS}`}
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
          >
            <div
              className={`studio-shimmer relative h-full overflow-hidden rounded-full ${AI_GRADIENT} transition-[width] duration-500 ease-out motion-reduce:transition-none`}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
          {aside && <div className="mt-2.5 text-xs text-muted-foreground">{aside}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
