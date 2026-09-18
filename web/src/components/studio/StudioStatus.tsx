'use client';

/**
 * StudioStatus — the three rooms and whether each is ready, with the way in
 * when one is not. The interview room IS the existing Business Profile chat.
 */
import Link from 'next/link';
import { CheckCircle2, Circle, MessageSquareText, Target, Theater } from 'lucide-react';
import type { StudioState } from '@lad/frontend-features/tenant-studio';

const FIELD_LABELS: Record<string, string> = {
  companyName: 'Company name', industry: 'Industry', valueProposition: 'Value proposition', productsServices: 'Products / services',
  targetCustomers: 'Target customers', companyDescription: 'Company description', icpJobTitles: 'Decision-maker titles',
  icpCompanySize: 'Company size', icpLocations: 'Locations', icpPainPoints: 'Pain points', operatingHours: 'Operating hours',
  timezone: 'Timezone', geographicFocus: 'Geographic focus', campaignTone: 'Campaign tone',
};

function Room({ icon: Icon, title, ready, detail, action }: {
  icon: typeof Target; title: string; ready: boolean; detail: string; action?: { href: string; label: string };
}) {
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${ready ? 'bg-card' : 'bg-muted/40'}`}>
      <div className={`mt-0.5 rounded-md p-2 ${ready ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {ready
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="ready" />
            : <Circle className="h-4 w-4 text-muted-foreground" aria-label="not ready" />}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
        {action && (
          <Link href={action.href} className="mt-2 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline">
            {action.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function StudioStatus({ state }: { state: StudioState }) {
  const { interview, agentPrompt, rehearsal, icpTraining } = state;
  const missing = interview.missing.map(k => FIELD_LABELS[k] ?? k);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Room
        icon={MessageSquareText}
        title="1. Interview"
        ready={interview.complete}
        detail={interview.complete
          ? `Profile complete — ${interview.required} required and ${interview.optionalFilled} of ${interview.optionalTotal} optional answered.`
          : `${interview.filled} of ${interview.required} required answered. Missing: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}.`}
        action={{ href: '/settings?tab=businessprofile', label: interview.complete ? 'Review your answers' : 'Continue the interview' }}
      />
      <Room
        icon={Target}
        title="2. Train the ICP"
        ready={icpTraining.ready}
        detail={icpTraining.ready
          ? 'Paste sample leads, see how the platform scores them, and correct it.'
          : 'Finish the required profile answers first — the scorer reads them.'}
      />
      <Room
        icon={Theater}
        title="3. Rehearse"
        ready={rehearsal.ready}
        detail={rehearsal.ready
          ? `Your LinkedIn agent prompt is live (${agentPrompt.chars.toLocaleString()} characters). Play a prospect against it.`
          : rehearsal.reason === 'no_agent_prompt'
            ? 'Generate your LinkedIn agent prompt first — the rehearsal runs the prompt that actually runs.'
            : 'Finish the interview, then generate the agent prompt.'}
        action={rehearsal.ready ? undefined : { href: '/settings?tab=chat', label: 'Generate the agent prompt' }}
      />
    </div>
  );
}
