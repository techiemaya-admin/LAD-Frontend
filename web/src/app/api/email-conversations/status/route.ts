/** GET /api/email-conversations/status — check Gmail + Outlook + Custom SMTP connection */
import { NextRequest } from 'next/server';
import { proxyToBackend } from '../utils/proxy';

export async function GET(req: NextRequest) {
  const [gmail, outlook, custom] = await Promise.allSettled([
    proxyToBackend(req, '/api/social-integration/email/google/status', 'POST'),
    proxyToBackend(req, '/api/social-integration/email/microsoft/status', 'POST'),
    proxyToBackend(req, '/api/social-integration/email/custom/status', 'POST'),
  ]);

  const gmailData   = gmail.status   === 'fulfilled' ? await gmail.value.json().catch(() => ({}))   : {};
  const outlookData = outlook.status === 'fulfilled' ? await outlook.value.json().catch(() => ({})) : {};
  const customData  = custom.status  === 'fulfilled' ? await custom.value.json().catch(() => ({}))  : {};

  return Response.json({
    gmail:   { connected: !!gmailData?.connected,   email: gmailData?.email   || null },
    outlook: { connected: !!outlookData?.connected, email: outlookData?.email || null },
    custom:  { connected: !!customData?.connected,  email: customData?.email  || null },
  });
}
