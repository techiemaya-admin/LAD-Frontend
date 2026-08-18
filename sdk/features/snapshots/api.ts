// Vertical snapshots SDK — API layer. All HTTP for this feature lives here.
//
// Routes through the shared apiClient, which (in the browser) goes same-origin
// via the Next.js [feature]/[...path] proxy. The proxy mirrors backend paths
// 1:1, so /api/snapshot/* needs no additional plumbing.
import { apiGet, apiPatch, apiPost } from '../../shared/apiClient';
import type {
  PipelineOverview, PipelineKey, KnobValues, KnobProposalsResult, SampleConversation,
} from './types';

const BASE = '/api/snapshot';

/**
 * The Pipelines page payload: entitlement, the tenant's own on/off state, and
 * campaign counts for each of the four pipelines.
 *
 * Returns `vertical: null` with an empty list for a tenant outside a snapshot —
 * that is a valid response, not an error.
 */
export async function getPipelineOverview(): Promise<PipelineOverview> {
  const res = await apiGet<{ success: boolean; data: PipelineOverview }>(`${BASE}/pipelines`);
  return res.data.data;
}

/**
 * Flip the tenant's activation switch for one pipeline.
 *
 * This changes only whether the tenant has it switched ON. It cannot grant an
 * entitlement — the server refuses with 403 `not_entitled` if the workspace
 * does not already have the pipeline.
 */
export async function setPipelineActive(
  key: PipelineKey,
  active: boolean
): Promise<{ key: PipelineKey; active: boolean }> {
  const res = await apiPatch<{ success: boolean; data: { key: PipelineKey; active: boolean } }>(
    `${BASE}/pipelines/${key}`,
    { active }
  );
  return res.data.data;
}

/**
 * Save settings for one pipeline. Send only the fields that changed — the
 * server merges over what is stored rather than replacing it, which is what
 * keeps a newer snapshot version's values intact across a rollback.
 *
 * Validation is server-side; on failure the response carries a `details` array
 * of per-field messages.
 */
export async function setPipelineKnobs(
  key: PipelineKey,
  values: KnobValues
): Promise<{ key: PipelineKey; values: KnobValues }> {
  const res = await apiPatch<{ success: boolean; data: { key: PipelineKey; values: KnobValues } }>(
    `${BASE}/pipelines/${key}/knobs`,
    { values }
  );
  return res.data.data;
}

/**
 * Read the workspace's own prompts and past conversations and PROPOSE settings,
 * each carrying the quote it was read from.
 *
 * Writes nothing. Approved proposals are saved through setPipelineKnobs, so
 * there is exactly one path that can change a tenant's settings.
 *
 * POST rather than GET because it costs LLM credits and is not safely
 * repeatable. `sampleConversationIds` narrows the read to specific
 * conversations — three that went the way the studio wants beat forty that
 * did not.
 */
export async function requestKnobProposals(
  key: PipelineKey,
  sampleConversationIds: string[] = []
): Promise<KnobProposalsResult> {
  const res = await apiPost<{ success: boolean; data: KnobProposalsResult }>(
    `${BASE}/pipelines/${key}/knob-proposals`,
    sampleConversationIds.length ? { sampleConversationIds } : {}
  );
  return res.data.data;
}

/**
 * Conversations a studio can offer as samples.
 *
 * Reads the CONVERSATIONS feature's list endpoint rather than adding a snapshot
 * one. These are the same rows the Conversations page shows and the same
 * `conversations.id` the extractor reads by, so a second endpoint would be a
 * second shape of the same data, free to drift.
 *
 * Sorted by recency by the server. Trivial threads are not filtered out here —
 * message counts are shown instead, because "too short to be useful" is a
 * judgement for the person picking, not for this function.
 */
export async function listSampleConversations(limit = 40): Promise<SampleConversation[]> {
  const res = await apiGet<{ success: boolean; data: RawConversation[] }>(
    `/api/whatsapp-conversations/conversations?limit=${limit}`
  );
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows.map((r) => ({
    id: String(r.id),
    name: r.lead_name || r.contact_name || r.phone || 'Unknown',
    messageCount: Number(r.message_count) || 0,
    lastMessage: r.last_message_content || '',
    lastMessageAt: r.last_message_at || null,
    stage: r.context_status || null,
  }));
}

/** Only the fields this feature reads; the endpoint returns many more. */
interface RawConversation {
  id: string;
  lead_name?: string;
  contact_name?: string;
  phone?: string;
  message_count?: number;
  last_message_content?: string;
  last_message_at?: string;
  context_status?: string;
}
