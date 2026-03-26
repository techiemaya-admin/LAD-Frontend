import { NextRequest } from 'next/server';
import { handleProxy } from '../../../utils/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = `/api/voice-agent/settings/${path.join('/')}`;
  return handleProxy(req, endpoint);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = `/api/voice-agent/settings/${path.join('/')}`;
  return handleProxy(req, endpoint);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = `/api/voice-agent/settings/${path.join('/')}`;
  return handleProxy(req, endpoint);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = `/api/voice-agent/settings/${path.join('/')}`;
  return handleProxy(req, endpoint);
}
