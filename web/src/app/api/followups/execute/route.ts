/**
 * Execute Followups Proxy
 * POST /api/followups/execute → Followup Scheduler :8001 /execute
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getFollowupServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(req, getFollowupServiceUrl(), '/execute');
}
