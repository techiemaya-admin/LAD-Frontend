/**
 * Tenant-wide learned-corrections list
 * GET → LAD-WABA-Comms /api/conversations/feedback/corrections
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/conversations/feedback/corrections');
}
