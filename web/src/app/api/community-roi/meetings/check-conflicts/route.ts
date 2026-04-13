/**
 * /api/community-roi/meetings/check-conflicts
 * POST - check whether a proposed meeting time conflicts with existing bookings
 *
 * Request body:
 *   { member_a_id, member_b_id, meeting_date, start_time, end_time }
 *
 * Response:
 *   { conflicts: ConflictError[] }   — empty array = no conflicts
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = () =>
  process.env.NEXT_PUBLIC_COMMUNITY_API_URL ||
  'https://lad-backend-develop-160078175457.us-central1.run.app'

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('token')?.value || ''
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.text()
    const token = getToken(req)

    const res = await fetch(`${BACKEND()}/api/community-roi/meetings/check-conflicts`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body,
    })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Proxy error', message: String(err) }, { status: 500 })
  }
}
