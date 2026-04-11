/**
 * /api/community-roi/meetings
 * GET  - list meetings for a date range
 * POST - create a new 1-2-1 meeting (with server-side conflict check)
 *
 * Proxies to NEXT_PUBLIC_COMMUNITY_API_URL/api/community-roi/meetings
 * which is handled by the LAD backend service.
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
    const search = req.nextUrl.searchParams.toString()
    const url    = `${BACKEND()}/api/community-roi/meetings${search ? `?${search}` : ''}`
    const token  = getToken(req)

    const res = await fetch(url, {
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

export async function POST(req: NextRequest) {
  try {
    const body  = await req.text()
    const token = getToken(req)
    const url   = `${BACKEND()}/api/community-roi/meetings`

    const res = await fetch(url, {
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
