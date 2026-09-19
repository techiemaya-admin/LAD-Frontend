'use client';

/**
 * TeamStrip — the five named agents on the Studio rooms view: who is on,
 * who is ready to speak, and the way back into Step 6 to change it.
 *
 * Reads `state.channels`; renders nothing on backends that predate it
 * (absence is "not reported", not "nobody is set up").
 */
import { CheckCircle2, CircleAlert, Instagram, Linkedin, Mail, MessageCircle, Phone, Users } from 'lucide-react';
import type { StudioChannel, StudioChannelSummary } from '@lad/frontend-features/tenant-studio';

const ORDER: StudioChannel[] = ['email', 'whatsapp', 'instagram', 'linkedin', 'voice'];
const META: Record<StudioChannel, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  instagram: { label: 'Instagram', icon: Instagram },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  voice: { label: 'Voice', icon: Phone },
};

function initials(name: string | null | undefined): string {
  const src = (name && name.trim()) || '';
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

export interface TeamStripProps {
  channels: StudioChannelSummary[] | undefined;
  onEdit: () => void;
}

export default function TeamStrip({ channels, onEdit }: TeamStripProps) {
  if (!channels) return null;
  const byChannel = new Map(channels.map((c) => [c.channel, c]));
  const on = channels.filter((c) => c.isOn);
  const ready = on.filter((c) => c.ready);
  return (
    <section className="rounded-lg border bg-card p-4" data-testid="team-strip">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-semibold">Your team</h2>
          <span className="text-xs text-muted-foreground">
            {on.length === 0 ? 'No channels on yet' : `${ready.length} of ${on.length} on and ready`}
          </span>
        </div>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
          {on.length === 0 ? 'Set up your channels →' : 'Change how they talk →'}
        </button>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-5">
        {ORDER.map((ch) => {
          const c = byChannel.get(ch);
          const meta = META[ch];
          const Icon = meta.icon;
          const isOn = c?.isOn ?? false;
          const isReady = isOn && (c?.ready ?? false);
          return (
            <li key={ch} className={`flex items-center gap-2.5 rounded-md border p-2 ${isOn ? 'bg-background' : 'bg-muted/40'}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isOn ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {initials(c?.agentName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-medium">{meta.label}</span>
                  {isReady && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="ready" />}
                  {isOn && !isReady && <CircleAlert className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-label="not ready" />}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {!isOn ? 'Off' : c?.agentName?.trim() ? `${c.agentName.trim()}${isReady ? '' : ' · needs a first line'}` : isReady ? 'Ready' : 'Needs a first line'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
