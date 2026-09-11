import { NextRequest, NextResponse } from 'next/server';
import { forwardJson } from '../../../auth/identity-proxy';

const SIGNUP_TOKEN_HEADER = 'x-signup-token';

/** GET — the applicant's own application status (signup token). */
export async function GET(req: NextRequest) {
  const signupToken = req.headers.get(SIGNUP_TOKEN_HEADER);
  if (!signupToken) {
    return NextResponse.json({ success: false, error: 'Not verified.', code: 'signup_token_invalid' }, { status: 401 });
  }
  return forwardJson(req, '/api/signup/applications/mine', 'GET', {
    headers: { [SIGNUP_TOKEN_HEADER]: signupToken },
    tag: '[/api/signup/applications/mine]',
  });
}
