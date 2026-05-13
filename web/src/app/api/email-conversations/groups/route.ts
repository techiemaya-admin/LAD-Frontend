/** GET /api/email-conversations/groups | POST — create group */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../utils/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return proxyToWABA(req, `/api/email/groups${qs ? `?${qs}` : ''}`);
}

export async function POST(req: NextRequest) {
  return proxyToWABA(req, '/api/email/groups', 'POST');
}
