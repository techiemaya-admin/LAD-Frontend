/**
 * /api/email-comms/groups/[id]
 *   GET    → LAD-Email-Comms GET /api/email-broadcast/groups/{id}   (with members)
 *   PATCH  → LAD-Email-Comms PATCH /api/email-broadcast/groups/{id}
 *   DELETE → LAD-Email-Comms DELETE /api/email-broadcast/groups/{id} (soft-delete, 204)
 */
import { NextRequest } from 'next/server';
import { proxyToEmailComms } from '../../utils/email-proxy';

async function forward(
  req: NextRequest,
  params: Promise<{ id: string }>,
): Promise<Response> {
  const { id } = await params;
  return proxyToEmailComms(
    req,
    `/api/email-broadcast/groups/${encodeURIComponent(id)}`,
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return forward(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return forward(req, params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return forward(req, params);
}
