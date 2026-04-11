/**
 * /api/community-roi/calendar-settings
 * GET - fetch current calendar settings (enable/disable status + config)
 * PUT - update calendar settings (e.g. toggle is_enabled)
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

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req)
    const res = await fetch(`${BACKEND()}/api/community-roi/calendar-settings`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
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

export async function PUT(req: NextRequest) {
  try {
    const body  = await req.text()
    const token = getToken(req)

    const res = await fetch(`${BACKEND()}/api/community-roi/calendar-settings`, {
      method: 'PUT',
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
