/**
 * Injury-Review Proxy
 * GET   /api/whatsapp-conversations/conversations/:id/injury-review
 * PATCH /api/whatsapp-conversations/conversations/:id/injury-review
 *   → Backend /api/conversations/:id/injury-review (LAD-WABA-Comms)
 *
 * Backs the staff control that clears the injury-screening booking gate:
 * when a customer reports an injury the bot keeps chatting but will not
 * show class times or book until a human reviews the case.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

/** Force WABA channel routing - this endpoint only exists on LAD-WABA-Comms. */
function withWabaChannel(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(
    withWabaChannel(req),
    getWhatsAppServiceUrl(),
    `/api/conversations/${id}/injury-review`
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToPythonService(
    withWabaChannel(req),
    getWhatsAppServiceUrl(),
    `/api/conversations/${id}/injury-review`
  );
}
