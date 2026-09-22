import { NextRequest } from 'next/server';
import { forwardJson } from '../identity-proxy';

/** POST { credential } — Google ID token → session (existing user) or signup token. */
export async function POST(req: NextRequest) {
  return forwardJson(req, '/api/auth/google', 'POST', { tag: '[/api/auth/google]' });
}
