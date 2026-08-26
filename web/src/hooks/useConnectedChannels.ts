'use client';

/**
 * useConnectedChannels - which conversation channels does this tenant have
 * integrated right now?
 *
 * Used by Chat Settings to show settings only for connected channels (hidden
 * channels reappear automatically when the tenant reconnects, because
 * visibility is derived from live status on every mount - nothing is deleted).
 *
 * Probes mirror IntegrationsSettings.refreshStatuses, but with different
 * error semantics because here a wrong answer HIDES a tenant's settings:
 *   - 2xx with no active account  → 'disconnected' (positively not connected)
 *   - 404                         → 'disconnected' (route/service absent in
 *     this environment - the channel is genuinely unusable here, not flaky)
 *   - 5xx / network error / other → 'unknown' (transient - FAIL-OPEN, treated
 *     as visible so an outage can never make settings vanish)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

export type ChannelId = 'waba' | 'personal_whatsapp' | 'linkedin' | 'gmail' | 'instagram' | 'voice';
export type ChannelStatus = 'connected' | 'disconnected' | 'unknown';

const INITIAL: Record<ChannelId, ChannelStatus> = {
  waba: 'unknown',
  personal_whatsapp: 'unknown',
  linkedin: 'unknown',
  gmail: 'unknown',
  instagram: 'unknown',
  voice: 'unknown',
};

type ProbeResult =
  | { kind: 'ok'; data: any }
  | { kind: 'absent' }     // HTTP 404 - endpoint not available in this env
  | { kind: 'error' };     // network failure or non-404 error status

async function probe(path: string, init?: RequestInit): Promise<ProbeResult> {
  try {
    const res = await fetchWithTenant(path, init);
    if (res.status === 404) return { kind: 'absent' };
    if (!res.ok) return { kind: 'error' };
    return { kind: 'ok', data: await res.json() };
  } catch {
    return { kind: 'error' };
  }
}

/** Map a probe outcome to a status given an "any active account?" predicate. */
function toStatus(result: ProbeResult, hasActive: (data: any) => boolean): ChannelStatus {
  if (result.kind === 'absent') return 'disconnected';
  if (result.kind === 'error') return 'unknown';
  return hasActive(result.data) ? 'connected' : 'disconnected';
}

async function probePersonalWhatsapp(): Promise<ChannelStatus> {
  return toStatus(await probe('/api/personal-whatsapp/accounts'), (data) => {
    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
    return accounts.some((a: any) => a.status === 'connected');
  });
}

async function probeWaba(): Promise<ChannelStatus> {
  return toStatus(await probe('/api/whatsapp-conversations/admin/whatsapp-accounts'), (data) => {
    const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
    return accounts.some((a: any) => a.status === 'active' || a.status === 'connected');
  });
}

async function probeLinkedin(): Promise<ChannelStatus> {
  return toStatus(await probe('/api/campaigns/linkedin/accounts'), (data) => {
    const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
    return accounts.some((a: any) => a.status === 'connected' || a.status === 'active');
  });
}

/**
 * The "Gmail" prompts channel drives email-agent replies for whichever email
 * provider is connected, so it counts as connected when EITHER Google or
 * Microsoft is. Unknown only when a transient failure leaves the answer
 * genuinely ambiguous.
 */
async function probeEmail(): Promise<ChannelStatus> {
  const [google, microsoft] = await Promise.all([
    probe('/api/social-integration/email/google/status', { method: 'POST' }),
    probe('/api/social-integration/email/microsoft/status', { method: 'POST' }),
  ]);
  const g = toStatus(google, (d) => !!d?.connected);
  const m = toStatus(microsoft, (d) => !!d?.connected);
  if (g === 'connected' || m === 'connected') return 'connected';
  if (g === 'unknown' || m === 'unknown') return 'unknown';
  return 'disconnected';
}

async function probeInstagram(): Promise<ChannelStatus> {
  return toStatus(await probe('/api/instagram-conversations/accounts'), (data) => {
    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
    return accounts.some((a: any) => (a.status ?? 'active') !== 'inactive' && !a.is_deleted);
  });
}

/** Voice is "connected" when the tenant has at least one usable voice agent. */
async function probeVoice(): Promise<ChannelStatus> {
  return toStatus(await probe('/api/voice-agent/user/available-agents'), (data) => {
    const agents = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    return agents.length > 0;
  });
}

export function useConnectedChannels() {
  const [statuses, setStatuses] = useState<Record<ChannelId, ChannelStatus>>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [waba, personal, linkedin, gmail, instagram, voice] = await Promise.all([
        probeWaba(),
        probePersonalWhatsapp(),
        probeLinkedin(),
        probeEmail(),
        probeInstagram(),
        probeVoice(),
      ]);
      const next = { waba, personal_whatsapp: personal, linkedin, gmail, instagram, voice };
      // Visible in devtools so "why is this tab shown/hidden?" is answerable.
      // 'unknown' = probe failed transiently → treated as visible (fail-open).
      // eslint-disable-next-line no-console -- intentional diagnostic (see comment above)
      console.debug('[useConnectedChannels] statuses', next);
      setStatuses(next);
      setLoaded(true);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Visible unless positively disconnected - loading/unknown stay visible. */
  const isVisible = useCallback(
    (id: ChannelId) => statuses[id] !== 'disconnected',
    [statuses],
  );

  return { statuses, loaded, refresh, isVisible };
}
