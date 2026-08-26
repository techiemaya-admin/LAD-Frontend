/**
 * /api/email-comms/groups
 *   GET  → LAD-Email-Comms GET /api/email-broadcast/groups
 *   POST → LAD-Email-Comms POST /api/email-broadcast/groups
 *
 * Query (GET): channel=gmail|outlook (optional filter)
 * Body (POST): { name, channel, color?, description? }
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../utils/email-proxy';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/groups');
}

export async function POST(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/groups');
}
