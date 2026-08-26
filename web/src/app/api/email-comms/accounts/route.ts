/**
 * GET /api/email-comms/accounts  → LAD-Email-Comms GET /api/email-broadcast/accounts
 *
 * Returns { accounts: ConnectedAccount[] } - the connected Gmail / Outlook /
 * custom SMTP accounts the tenant can send broadcasts from. Used by the
 * Compose dialog's "From" account picker.
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../utils/email-proxy';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToEmailComms(req, '/api/email-broadcast/accounts');
}
