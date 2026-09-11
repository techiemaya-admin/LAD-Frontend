import { NextRequest } from 'next/server';
import { forwardJson } from '../../identity-proxy';

/** POST { phone } — send a WhatsApp one-time code. */
export async function POST(req: NextRequest) {
  return forwardJson(req, '/api/auth/otp/request', 'POST', { tag: '[/api/auth/otp/request]' });
}
