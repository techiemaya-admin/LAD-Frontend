import { NextRequest, NextResponse } from 'next/server';
import { forwardJson, callerToken } from '../../auth/identity-proxy';

const SIGNUP_TOKEN_HEADER = 'x-signup-token';

/** POST — applicant submits; authorised by the signup token, not a session. */
export async function POST(req: NextRequest) {
  const signupToken = req.headers.get(SIGNUP_TOKEN_HEADER);
  if (!signupToken) {
    return NextResponse.json({ success: false, error: 'Not verified.', code: 'signup_token_invalid' }, { status: 401 });
  }
  return forwardJson(req, '/api/signup/applications', 'POST', {
    headers: { [SIGNUP_TOKEN_HEADER]: signupToken },
    tag: '[/api/signup/applications POST]',
  });
}

/** GET — super-admin queue; the backend enforces the super-admin check. */
export async function GET(req: NextRequest) {
  const token = callerToken(req);
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  const qs = req.nextUrl.search || '';
  return forwardJson(req, `/api/signup/applications${qs}`, 'GET', {
    headers: { Authorization: `Bearer ${token}` },
    tag: '[/api/signup/applications GET]',
  });
}
