/**
 * Personas proxy — every per-user agent persona in the tenant.
 *
 * WABA only. A persona is keyed on the user who owns a WhatsApp NUMBER, and
 * personal-WhatsApp has no equivalent ownership model, so there is nothing to
 * route there.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../utils/python-proxy';

function asWaba(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return proxyToPythonService(asWaba(req), getWABAServiceUrl(), '/api/settings/personas');
}
