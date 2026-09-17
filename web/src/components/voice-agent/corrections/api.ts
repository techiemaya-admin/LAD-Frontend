/**
 * Per-agent corrections ("don't say X, say Y") — thin client over
 *   /api/voice-agent/settings/agents/:agentId/corrections
 * (LAD_backend, proxied by the [feature]/[...path] route).
 *
 * The VOAG worker applies each row in two layers on the next call: appended to
 * the LLM instructions, and substituted deterministically before TTS. That is
 * why saving one here is enough — no prompt edit, no redeploy.
 */
import { safeStorage } from '@lad/shared/storage';

export type CorrectionKind = 'vocab' | 'pronunciation' | 'style' | 'liked' | 'disliked';
export type CorrectionTarget = 'tts' | 'prompt' | 'both';

export interface AgentCorrection {
  id: string;
  agent_id: number;
  wrong: string;
  right: string;
  kind: CorrectionKind;
  applies_to: CorrectionTarget;
  source: string;
  source_call_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorrectionInput {
  wrong: string;
  right: string;
  kind?: CorrectionKind;
  applies_to?: CorrectionTarget;
  source?: string;
  source_call_id?: string | null;
}

export const CORRECTION_KIND_LABELS: Record<CorrectionKind, { label: string; hint: string }> = {
  vocab: { label: 'Word', hint: 'Replace the word everywhere: in what the agent says and how it is written.' },
  pronunciation: { label: 'Pronunciation', hint: 'Keep the spelling in transcripts, but have the voice read it as the replacement.' },
  style: { label: 'Style rule', hint: 'A phrasing rule for the agent (no replacement needed).' },
  liked: { label: '👍 Liked line', hint: 'A whole line the team liked — kept as an example of the right tone and length.' },
  disliked: { label: '👎 Disliked line', hint: 'A whole line the team disliked — never said again; the replacement is used if given.' },
};

/** The kinds a user picks in the word popover / manual add. Line feedback comes from 👍/👎 only. */
export const PICKABLE_KINDS: CorrectionKind[] = ['vocab', 'pronunciation', 'style'];

function authHeaders(): HeadersInit {
  const token = safeStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    /* not JSON */
  }
  return fallback;
}

export async function listCorrections(agentId: number | string): Promise<AgentCorrection[]> {
  const res = await fetch(`/api/voice-agent/settings/agents/${agentId}/corrections`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not load corrections'));
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

/** Upsert: saving the same `wrong` twice updates the replacement. */
export async function saveCorrection(agentId: number | string, input: CorrectionInput): Promise<AgentCorrection> {
  const res = await fetch(`/api/voice-agent/settings/agents/${agentId}/corrections`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not save correction'));
  const body = await res.json();
  return body.data as AgentCorrection;
}

export async function deleteCorrection(agentId: number | string, correctionId: string): Promise<void> {
  const res = await fetch(`/api/voice-agent/settings/agents/${agentId}/corrections/${correctionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not delete correction'));
}
