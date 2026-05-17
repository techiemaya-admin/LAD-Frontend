/**
 * Follow-up Config Proxy
 * GET /api/whatsapp-conversations/followup-config → Python /api/followup-config
 * PUT /api/whatsapp-conversations/followup-config → Python /api/followup-config
 *
 * Routes to LAD-WABA-Comms (Python FastAPI) which persists the config to the
 * tenant's followup_config JSONB table. The Node.js stub at
 * /api/personal-whatsapp/followup-config does not persist — do not use it.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../utils/python-proxy';

export async function GET(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/followup-config');
}

export async function PUT(req: NextRequest) {
  return proxyToPythonService(req, getWABAServiceUrl(), '/api/followup-config');
}
