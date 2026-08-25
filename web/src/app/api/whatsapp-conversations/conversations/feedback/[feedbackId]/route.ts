/**
 * Toggle one correction on/off
 * PATCH → LAD-WABA-Comms /api/conversations/feedback/:id
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../../utils/python-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const { feedbackId } = await params;
  return proxyToPythonService(req, getWABAServiceUrl(), `/api/conversations/feedback/${feedbackId}`);
}
