/** GET /api/email-conversations/messages?contact_id=xxx  — fetch thread
 *  POST /api/email-conversations/messages                — save sent message */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../utils/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return proxyToWABA(req, `/api/email/messages${qs ? `?${qs}` : ''}`);
}

export async function POST(req: NextRequest) {
  return proxyToWABA(req, '/api/email/messages', 'POST');
}
