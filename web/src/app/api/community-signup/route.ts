/**
 * Public signup relay for the /community landing page.
 *
 * The browser posts here rather than straight at LAD_backend so the backend
 * origin stays server-side and there is no cross-origin preflight on a public
 * marketing page.
 *
 * Deliberately thin: validation, rate limiting, the honeypot and persistence
 * all live in the backend controller. Duplicating any of that here would give
 * two places to keep in sync and one of them would drift.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3004';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND}/api/community/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forwarded so the backend's per-IP limit sees the real client rather
        // than this server, which would otherwise rate-limit every visitor as one.
        'x-forwarded-for':
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        referer: request.headers.get('referer') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    // A signup we cannot store must not look like a success - the visitor
    // would walk away believing they applied.
    return NextResponse.json(
      { success: false, error: 'We could not reach the server. Please try again.' },
      { status: 502 },
    );
  }
}
