/**
 * GET /api/analytics/overview - tenant conversation analytics for the Overview page.
 *
 * Proxies to LAD-Master-Agent GET /analytics/overview (which derives the SAH
 * funnel, daily-volume spike, and unconverted-topic segments from the tenant's
 * conversation tables). The shared master-agent-proxy helper injects tenant_id
 * (from the user's JWT) + the X-Service-Token; pass-through query: window_days.
 */
import { NextRequest } from 'next/server';

import { proxyToMasterAgent } from '../../prospects/utils/master-agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToMasterAgent(req, '/analytics/overview');
}
