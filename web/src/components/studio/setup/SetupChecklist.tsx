'use client';

/**
 * SetupChecklist — "Review and go live": what is ready, what still blocks a
 * launch, and what would merely improve results.
 *
 * Every row derives from StudioState (the interview's missing keys, the
 * agent-prompt / rehearsal readiness, goals) plus the wallet balance. Amber
 * rows link to the exact settings tab that fixes them. Failure is not
 * emptiness: a wallet that could not load shows as "unknown", not as zero.
 */
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, CircleAlert, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreditsBalance } from '@lad/frontend-features/billing';
import type { BriefFirstCampaign, StudioState } from '@lad/frontend-features/tenant-studio';

type Status = 'ready' | 'needed' | 'optional' | 'unknown';

interface RowSpec {
  key: string;
  title: string;
  status: Status;
  detail: string;
  link?: { href: string; label: string };
  /** An in-flow action instead of (or as well as) a link — e.g. open Step 6. */
  action?: { onClick: () => void; label: string };
}

/* Profile keys grouped by the question each checklist row answers. Keys a
 * vertical adds fall outside these groups and surface via the interview
 * room, not here. */
const COMPANY_KEYS = ['companyName', 'industry', 'companyDescription', 'operatingHours', 'timezone', 'senderName', 'contactEmail', 'contactPhone'];
const OFFER_KEYS = ['valueProposition', 'productsServices', 'campaignTone'];
const TARGET_KEYS = ['targetCustomers', 'icpJobTitles', 'icpCompanySize', 'icpLocations', 'icpPainPoints', 'geographicFocus', 'excludedCompanies', 'doNotContact'];

const PROFILE_HREF = '/settings?tab=businessprofile';
const CHANNEL_LABELS: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram', linkedin: 'LinkedIn', voice: 'Voice' };

function Row({ row }: { row: RowSpec }) {
  const icon = row.status === 'ready'
    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="ready" />
    : row.status === 'needed'
      ? <CircleAlert className="h-5 w-5 text-amber-600" aria-label="needed" />
      : row.status === 'unknown'
        ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="checking" />
        : <Circle className="h-5 w-5 text-muted-foreground" aria-label="optional" />;
  return (
    <li className={`flex gap-3 px-4 py-3 ${row.status === 'needed' ? 'bg-amber-50/60' : ''}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`font-medium ${row.status === 'optional' ? 'text-muted-foreground' : ''}`}>{row.title}</span>
          {row.status === 'optional' && <span className="text-[11px] text-muted-foreground">Improves results, not required</span>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{row.detail}</p>
        {row.action && (
          <button type="button" onClick={row.action.onClick} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline">
            {row.action.label}<ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {row.link && (
          <Link href={row.link.href} className={`${row.action ? 'ml-3 ' : ''}mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline`}>
            {row.link.label}<ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </li>
  );
}

export interface SetupChecklistProps {
  state: StudioState;
  /** The first campaign the tenant approved on the review card, if any. */
  firstCampaign?: BriefFirstCampaign | null;
  /** Profile keys still needed before the first campaign can launch. */
  blockingMissing?: string[];
  /** Whether the tenant gave links (website, LinkedIn, Instagram) to read. */
  hasReferences?: boolean;
  onOpenStudio: () => void;
  opening?: boolean;
  /** Opens Step 6 (how your agents talk) in the flow; omitted on backends without channel profiles. */
  onSetupChannels?: () => void;
}

export default function SetupChecklist({ state, firstCampaign, blockingMissing = [], hasReferences = false, onOpenStudio, opening, onSetupChannels }: SetupChecklistProps) {
  const wallet = useCreditsBalance();
  const missing = new Set(state.interview.missing);
  const missingIn = (keys: string[]) => keys.filter((k) => missing.has(k));

  const companyMissing = missingIn(COMPANY_KEYS);
  const offerMissing = missingIn(OFFER_KEYS);
  const targetMissing = missingIn(TARGET_KEYS);
  const goals = state.goals ?? [];
  const balance = wallet.data ? (wallet.data.availableBalance ?? wallet.data.currentBalance ?? null) : null;
  const walletUnknown = wallet.data === undefined;
  const channelsOn = (state.channels ?? []).filter((c) => c.isOn);
  const channelsReady = channelsOn.filter((c) => c.ready);

  const rows: RowSpec[] = [
    {
      key: 'company',
      title: 'Company and sender',
      status: companyMissing.length ? 'needed' : 'ready',
      detail: companyMissing.length
        ? `${companyMissing.length} answer${companyMissing.length === 1 ? '' : 's'} still missing — messages go out in your name, so this must be right.`
        : 'Your company, hours and who the messages come from are set.',
      link: companyMissing.length ? { href: PROFILE_HREF, label: 'Fill in the missing answers' } : undefined,
    },
    {
      key: 'offer',
      title: 'What you sell',
      status: offerMissing.length ? 'needed' : 'ready',
      detail: offerMissing.length
        ? 'It cannot write a convincing first message without your offer and why it is different.'
        : 'Your products, value and tone are set.',
      link: offerMissing.length ? { href: PROFILE_HREF, label: 'Describe your offer' } : undefined,
    },
    {
      key: 'target',
      title: 'Who to target and who to skip',
      status: targetMissing.length ? 'needed' : 'ready',
      detail: targetMissing.length
        ? 'Titles, company size, locations and who never to contact keep the campaign on the right people.'
        : 'Your ideal customer and exclusions are set.',
      link: targetMissing.length ? { href: PROFILE_HREF, label: 'Define your audience' } : undefined,
    },
    {
      key: 'channel',
      title: 'A channel ready',
      status: state.rehearsal.ready ? 'ready' : 'needed',
      detail: state.rehearsal.ready
        ? `Your agent prompt is live (${state.agentPrompt.chars.toLocaleString()} characters).`
        : channelsReady.length
          ? `${channelsReady.map((c) => c.agentName?.trim() ? `${c.agentName.trim()} (${CHANNEL_LABELS[c.channel] ?? c.channel})` : CHANNEL_LABELS[c.channel] ?? c.channel).join(', ')} ${channelsReady.length === 1 ? 'is' : 'are'} set up — generate the agents so they can speak for you.`
          : channelsOn.length
            ? `${channelsOn.length} channel${channelsOn.length === 1 ? '' : 's'} switched on but not ready yet: each needs a first line and hand-over rules.`
            : state.rehearsal.reason === 'no_agent_prompt'
              ? 'Generate the agent prompt so at least one channel can speak for you.'
              : 'Finish the profile, then generate the agent prompt.',
      action: onSetupChannels ? { onClick: onSetupChannels, label: 'Set up your channels' } : undefined,
      link: state.rehearsal.ready || onSetupChannels ? undefined : { href: '/settings?tab=chat', label: 'Set up a channel' },
    },
    {
      key: 'campaign',
      title: 'First campaign',
      status: firstCampaign && blockingMissing.length === 0 ? 'ready' : 'needed',
      detail: firstCampaign
        ? blockingMissing.length
          ? `"${firstCampaign.offering}" via ${firstCampaign.channel ?? 'the channel you pick'} is drafted; ${blockingMissing.length} answer${blockingMissing.length === 1 ? '' : 's'} still needed before it can launch.`
          : `"${firstCampaign.offering}" via ${firstCampaign.channel ?? 'the channel you pick'}, to ${firstCampaign.audience}.`
        : 'No first campaign yet — build one from the campaigns page when the rows above are green.',
      link: firstCampaign && blockingMissing.length === 0 ? undefined : firstCampaign ? { href: PROFILE_HREF, label: 'Answer what is needed' } : { href: '/campaigns', label: 'Build a campaign' },
    },
    {
      key: 'credits',
      title: 'Credits',
      status: walletUnknown ? (wallet.isLoading ? 'unknown' : 'needed') : (balance ?? 0) > 0 ? 'ready' : 'needed',
      detail: walletUnknown
        ? wallet.isLoading ? 'Checking your wallet…' : 'Could not read your wallet balance right now.'
        : (balance ?? 0) > 0
          ? `${Number(balance).toLocaleString()} credits available.`
          : 'Every send costs credits; the first campaign pauses at zero.',
      link: !walletUnknown && (balance ?? 0) > 0 ? undefined : { href: '/settings?tab=credits', label: walletUnknown ? 'Open your wallet' : 'Add credits' },
    },
    {
      key: 'goals',
      title: 'Goals',
      status: goals.length ? 'ready' : 'optional',
      detail: goals.length
        ? `${goals.length} goal${goals.length === 1 ? '' : 's'} set — the overview tracks pace against ${goals.length === 1 ? 'it' : 'them'}.`
        : 'A 90-day target lets the overview tell you whether you are on pace.',
    },
    {
      key: 'references',
      title: 'References',
      status: hasReferences ? 'ready' : 'optional',
      detail: hasReferences
        ? 'It read your links; messages borrow your own wording.'
        : 'A website or LinkedIn page gives it your wording and proof points.',
    },
  ];

  const blockers = rows.filter((r) => r.status === 'needed').length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold leading-snug sm:text-2xl">
          {blockers === 0 ? 'Everything a launch needs is in place.' : `${blockers} thing${blockers === 1 ? '' : 's'} to fix before the first send.`}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {blockers === 0
            ? 'Open the studio to rehearse against your agent, or go straight to your first campaign.'
            : 'Each row links to where it is fixed. You can open the studio now and come back to these.'}
        </p>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {rows.map((row) => <Row key={row.key} row={row} />)}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onSetupChannels && (
          <Button type="button" size="lg" variant="outline" onClick={onSetupChannels} disabled={opening} className="w-full sm:w-auto">
            <Users className="h-4 w-4" />Set up your channels
          </Button>
        )}
        <Button type="button" size="lg" onClick={onOpenStudio} disabled={opening} className="w-full sm:w-auto">
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Open the studio<ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
