/**
 * One user's agent persona — read, save, or drop back to the tenant default.
 *
 * PUT forwards the body unchanged, which is load-bearing: the WABA endpoint
 * writes only the fields PRESENT in the body, so the editor sends just what
 * changed. A proxy that helpfully filled in the rest would pin those fields at
 * their current inherited values and stop them tracking the tenant default.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWABAServiceUrl } from '../../utils/python-proxy';

function asWaba(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');
  return new NextRequest(url, req);
}

const target = (userId: string) => `/api/settings/personas/${encodeURIComponent(userId)}`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return proxyToPythonService(asWaba(req), getWABAServiceUrl(), target(userId));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return proxyToPythonService(asWaba(req), getWABAServiceUrl(), target(userId));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return proxyToPythonService(asWaba(req), getWABAServiceUrl(), target(userId));
}
