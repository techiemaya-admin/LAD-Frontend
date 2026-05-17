import { NextRequest, NextResponse } from 'next/server';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function requireAdmin(request: NextRequest, bodyToken?: string): NextResponse | null {
  const adminToken = process.env.ADMIN_TOKEN;
  const headerToken = request.headers.get('x-admin-token');
  const queryToken = request.nextUrl.searchParams.get('token');
  const provided = bodyToken || headerToken || queryToken;

  if (!adminToken || !provided || provided !== adminToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
