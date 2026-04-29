/**
 * Bulk Operations Proxy
 * POST /api/whatsapp-conversations/conversations/bulk → Backend /api/conversations/bulk/*
 * Body must include { action: "status" | "labels" | "delete", ... }
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../utils/python-proxy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (!action || !['status', 'labels', 'delete', 'send-template'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 });
    }

    // Re-create the request with the body (minus the action field).
    // Explicitly copy auth + tenant headers so they survive the NextRequest clone —
    // new NextRequest(url, { headers: req.headers }) can silently drop them in some
    // Next.js versions when req.headers is a ReadonlyHeaders instance.
    const { action: _, ...payload } = body;
    const url = new URL(req.url);
    if (!url.searchParams.get('channel')) url.searchParams.set('channel', 'waba');

    const forwardedHeaders = new Headers();
    // Copy every header from the original request
    req.headers.forEach((value, key) => forwardedHeaders.set(key, value));
    // Force content-type for the re-serialised body
    forwardedHeaders.set('Content-Type', 'application/json');

    const newReq = new NextRequest(url, {
      method: 'POST',
      headers: forwardedHeaders,
      body: JSON.stringify(payload),
    });

    return proxyToPythonService(
      newReq,
      getWhatsAppServiceUrl(),
      `/api/conversations/bulk/${action}`
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
