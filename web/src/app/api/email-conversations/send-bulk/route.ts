/** POST /api/email-conversations/send-bulk — send template email via Gmail/Outlook */
import { NextRequest } from 'next/server';
import { proxyToBackend } from '../utils/proxy';

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/social-integration/email/send-bulk', 'POST');
}
