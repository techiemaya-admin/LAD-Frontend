/**
 * GET    /api/prospects/[id] - fetch a single prospect by id.
 * DELETE /api/prospects/[id] - soft-delete a prospect ("not a fit").
 *   Optional ?reason=... is forwarded to the Master Agent for audit logging.
 */
import { NextRequest } from 'next/server';

import { proxyToMasterAgent } from '../utils/master-agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToMasterAgent(req, `/prospects/${encodeURIComponent(id)}`);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  // proxyToMasterAgent forwards req.method (DELETE) + query params (e.g. reason).
  return proxyToMasterAgent(req, `/prospects/${encodeURIComponent(id)}`);
}
