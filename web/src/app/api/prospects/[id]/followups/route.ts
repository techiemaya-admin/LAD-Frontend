/**
 * GET /api/prospects/[id]/followups - upcoming scheduled automatic follow-ups
 * for a prospect, across channels. Forwarded to the Master Agent.
 */
import { NextRequest } from 'next/server';

import { proxyToMasterAgent } from '../../utils/master-agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToMasterAgent(req, `/prospects/${encodeURIComponent(id)}/followups`);
}
