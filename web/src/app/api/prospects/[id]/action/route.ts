/**
 * POST /api/prospects/[id]/action - apply a CRM "Take action" to a prospect.
 *   Query: do_not_contact=true|false  and/or  quiet_days=N
 * Forwarded (with tenant_id + service token) to the Master Agent.
 */
import { NextRequest } from 'next/server';

import { proxyToMasterAgent } from '../../utils/master-agent-proxy';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  // proxyToMasterAgent forwards req.method (POST) + query params (do_not_contact, quiet_days).
  return proxyToMasterAgent(req, `/prospects/${encodeURIComponent(id)}/action`);
}
