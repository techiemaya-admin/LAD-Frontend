/**
 * Templates Proxy
 *
 * GET  /api/whatsapp-conversations/conversations/templates → list templates
 * POST /api/whatsapp-conversations/conversations/templates → create template
 *
 * Channel routing (handled by proxyToPythonService):
 *   channel=personal → LAD_backend  /api/whatsapp-conversations/conversations/templates
 *   channel=waba     → Python svc   /api/conversations/templates
 *
 * proxyToPythonService automatically:
 *   1. Detects channel from query param or header
 *   2. Routes personal → getBackendUrl() with path transformed to /api/whatsapp-conversations/...
 *   3. Routes waba → getWABAServiceUrl() with path as-is (/api/conversations/...)
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService } from '../../utils/python-proxy';

export async function GET(req: NextRequest) {
  // proxyToPythonService detects channel automatically from query param or header
  return proxyToPythonService(req, 'unused', '/api/conversations/templates');
}

export async function POST(req: NextRequest) {
  // proxyToPythonService detects channel automatically from query param or header
  return proxyToPythonService(req, 'unused', '/api/conversations/templates');
}
