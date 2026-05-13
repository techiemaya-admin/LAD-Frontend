/** GET /api/email-conversations/contacts — list | POST — import */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../utils/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return proxyToWABA(req, `/api/email/contacts${qs ? `?${qs}` : ''}`);
}

export async function POST(req: NextRequest) {
  return proxyToWABA(req, '/api/email/contacts/import', 'POST');
}
