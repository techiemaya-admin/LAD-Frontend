// lad-monitor (admin observability) SDK - API layer.
// All HTTP lives here. Calls the LAD Node backend via the shared apiClient,
// which (in the browser) routes same-origin through the Next.js [feature]/[...path]
// proxy → /api/admin/monitor/* on the backend. Super-admin gating is enforced
// server-side; these calls simply carry the caller's auth token.
import { apiGet, apiPatch, apiPost, apiDelete } from '../../shared/apiClient';
import type {
  DashboardStats,
  DateRangeParams,
  TenantHealth,
  TenantDetail,
  CloudLogParams,
  CloudLogsResponse,
  CloudLogsConfig,
  CronHealth,
  SahCostData,
  TaskHealth,
  LlmCostData,
  MigrationStatusData,
  StrategyForReview,
  StrategyReviewStatus,
  SignupStatus,
  CommunitySignupsResponse,
  LlmRoutingFeature,
  LlmRoutingMeta,
  LlmRoutingEntry,
  LlmRoutingValidation,
} from './types';

const BASE = '/api/admin/monitor';

function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getDashboardStats(params?: DateRangeParams): Promise<DashboardStats> {
  const res = await apiGet<{ success: boolean; data: DashboardStats }>(
    `${BASE}/dashboard/stats${qs({ startDate: params?.startDate, endDate: params?.endDate })}`
  );
  return res.data.data;
}

export async function getMonitorTenants(
  params?: DateRangeParams & { includeConversations?: boolean }
): Promise<TenantHealth[]> {
  const res = await apiGet<{ success: boolean; data: TenantHealth[] }>(
    `${BASE}/tenants${qs({
      startDate: params?.startDate,
      endDate: params?.endDate,
      conversations: params?.includeConversations === false ? 'false' : undefined,
    })}`
  );
  return res.data.data || [];
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail> {
  const res = await apiGet<{ success: boolean; data: TenantDetail }>(`${BASE}/tenants/${tenantId}`);
  return res.data.data;
}

export async function getCloudLogs(params?: CloudLogParams): Promise<CloudLogsResponse> {
  const res = await apiGet<CloudLogsResponse>(
    `${BASE}/cloud-logs${qs({
      severity: params?.severity,
      service: params?.service,
      limit: params?.limit,
      pageToken: params?.pageToken,
      startTime: params?.startTime,
      endTime: params?.endTime,
    })}`
  );
  return res.data;
}

export async function getCloudLogServices(): Promise<string[]> {
  const res = await apiGet<{ success: boolean; services: string[] }>(`${BASE}/cloud-logs/services`);
  return res.data.services || [];
}

export async function getCloudLogsConfig(): Promise<CloudLogsConfig> {
  const res = await apiGet<CloudLogsConfig>(`${BASE}/cloud-logs/config`);
  return res.data;
}

export async function getCronHealth(): Promise<CronHealth> {
  const res = await apiGet<CronHealth>(`${BASE}/crons`);
  return res.data;
}

export async function getCostPerSah(params?: DateRangeParams): Promise<SahCostData> {
  const res = await apiGet<{ success: boolean; data: SahCostData }>(
    `${BASE}/sah${qs({ startDate: params?.startDate, endDate: params?.endDate })}`
  );
  return res.data.data;
}

export async function recomputeSah(): Promise<{ derived: number }> {
  const res = await apiPost<{ success: boolean; derived: number }>(`${BASE}/sah/recompute`, {});
  return { derived: res.data.derived };
}

export async function getTaskHealth(): Promise<TaskHealth> {
  const res = await apiGet<{ success: boolean; data: TaskHealth }>(`${BASE}/tasks`);
  return res.data.data;
}

export async function getLlmCost(params?: { days?: number }): Promise<LlmCostData> {
  const res = await apiGet<{ success: boolean; data: LlmCostData }>(
    `${BASE}/llm-cost${qs({ days: params?.days })}`
  );
  return res.data.data;
}

export async function getMigrationStatus(): Promise<MigrationStatusData> {
  const res = await apiGet<{ success: boolean; data: MigrationStatusData }>(`${BASE}/migrations`);
  return res.data.data;
}

// ── Strategy moderation ─────────────────────────────────────────────────────

/** Published strategies awaiting (or past) super-admin review. */
export async function getStrategiesForReview(
  status: StrategyReviewStatus = 'pending',
): Promise<StrategyForReview[]> {
  const res = await apiGet<{ success: boolean; data: StrategyForReview[] }>(
    `${BASE}/strategies?status=${encodeURIComponent(status)}`,
  );
  return res.data.data ?? [];
}

/**
 * Approve or reject a published strategy. Approving makes it visible in every
 * tenant's Community gallery; rejecting is the kill switch and works even when
 * sharing is disabled platform-wide.
 */
export async function reviewStrategy(
  id: string,
  decision: 'approve' | 'reject',
  note?: string,
): Promise<void> {
  await apiPost(`${BASE}/strategies/${id}/review`, { decision, note });
}

// ── Community signups ───────────────────────────────────────────────────────
// NOTE: these live under /api/community, NOT /api/admin/monitor - the public
// POST and the admin reads share one feature router on the backend.

export async function getCommunitySignups(
  status?: SignupStatus,
): Promise<CommunitySignupsResponse> {
  // Not the module-level qs() helper - a plain suffix, named distinctly so it
  // doesn't shadow it.
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiGet<{ success: boolean } & CommunitySignupsResponse>(
    `/api/community/signups${query}`,
  );
  return { data: res.data.data ?? [], summary: res.data.summary ?? {}, count: res.data.count ?? 0 };
}

export async function updateCommunitySignup(
  id: string,
  status: SignupStatus,
  notes?: string,
): Promise<void> {
  await apiPatch(`/api/community/signups/${id}`, { status, notes });
}

// ── LLM routing ─────────────────────────────────────────────────────────────
// Per-tenant, per-feature provider chains. Writes replace a feature's WHOLE
// chain (it is an ordered list - patching one hop at a time can leave two
// entries sharing a priority).

export async function getLlmRoutingMeta(): Promise<LlmRoutingMeta> {
  const res = await apiGet<{ success: boolean; data: LlmRoutingMeta }>(`${BASE}/llm-routing/meta`);
  return res.data.data;
}

export async function getTenantLlmRouting(tenantId: string): Promise<LlmRoutingFeature[]> {
  const res = await apiGet<{ success: boolean; data: LlmRoutingFeature[] }>(
    `${BASE}/llm-routing/${tenantId}`
  );
  return res.data.data;
}

/** Dry-run: returns the same verdict a save would, without persisting. */
export async function validateLlmRoutingChain(
  tenantId: string,
  featureKey: string,
  chain: LlmRoutingEntry[]
): Promise<LlmRoutingValidation> {
  const res = await apiPost<{ success: boolean; data: LlmRoutingValidation }>(
    `${BASE}/llm-routing/${tenantId}/${featureKey}/validate`,
    { chain }
  );
  return res.data.data;
}

export async function setLlmRoutingChain(
  tenantId: string,
  featureKey: string,
  chain: LlmRoutingEntry[]
): Promise<LlmRoutingFeature[]> {
  const res = await apiPost<{ success: boolean; data: LlmRoutingFeature[] }>(
    `${BASE}/llm-routing/${tenantId}/${featureKey}`,
    { chain }
  );
  return res.data.data;
}

/** Remove the tenant's rules for a feature - it reverts to the code default. */
export async function clearLlmRoutingChain(tenantId: string, featureKey: string): Promise<void> {
  await apiDelete(`${BASE}/llm-routing/${tenantId}/${featureKey}`);
}
