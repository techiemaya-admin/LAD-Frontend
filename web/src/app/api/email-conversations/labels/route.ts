/**
 * Labels Proxy
 * GET  /api/email-conversations/labels → Backend /api/labels
 * POST /api/email-conversations/labels → Backend /api/labels
 */
import { NextRequest } from 'next/server';
import { proxyToWABA } from '../utils/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return proxyToWABA(req, `/api/labels${qs ? `?${qs}` : ''}`);
}

export async function POST(req: NextRequest) {
  return proxyToWABA(req, '/api/labels');
}
