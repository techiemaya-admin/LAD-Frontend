/**
 * /api/community-roi/meetings/[id]
 * PATCH  - update meeting status / details
 * DELETE - soft-delete a meeting
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

interface RouteParams { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body   = await req.text()
    const token  = getToken(req)

    const res = await fetch(`${BACKEND()}/api/community-roi/meetings/${id}`, {
      method: 'PATCH',
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

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const token  = getToken(req)

    const res = await fetch(`${BACKEND()}/api/community-roi/meetings/${id}`, {
      method: 'DELETE',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
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
