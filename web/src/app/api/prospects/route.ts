/**
 * GET /api/prospects - list prospects for the current tenant.
 */
import { NextRequest } from 'next/server';

import { proxyToMasterAgent } from './utils/master-agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToMasterAgent(req, '/prospects');
}
