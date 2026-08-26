/**
 * /api/email-comms/contacts
 *   GET  → LAD-Email-Comms GET  /api/email-broadcast/contacts   (list + search)
 *   POST → LAD-Email-Comms POST /api/email-broadcast/contacts   (bulk create + optional group_id)
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../utils/email-proxy';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/contacts');
}

export async function POST(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/contacts');
}
