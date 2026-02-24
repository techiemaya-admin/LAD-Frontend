/**
 * SSE Streaming Proxy for /api/voice-agent/calls/stream
 *
 * Why a dedicated route is needed:
 * - The backend sets the JWT as an httpOnly cookie — JavaScript cannot read it.
 * - The generic proxy at /api/[feature]/[...path] buffers the full response (no streaming).
 * - This route reads the token server-side and pipes the SSE body straight through.
 */
import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../utils/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const backend = getBackendUrl();
    const backendUrl = `${backend}/api/voice-agent/calls/stream`;

    // Read token from httpOnly cookie (JS-inaccessible from browser)
    const token =
        req.cookies.get('token')?.value ||
        req.cookies.get('access_token')?.value;

    // --- DEBUG (remove after fix) ---
    console.log('[SSE Proxy] HIT — token present:', !!token, '| preview:', token?.substring(0, 30));
    // ---------------------------------

    const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const upstream = await fetch(backendUrl, {
            method: 'GET',
            headers,
            // @ts-expect-error — Node.js fetch supports duplex for streaming
            duplex: 'half',
        });

        if (!upstream.ok || !upstream.body) {
            const text = await upstream.text().catch(() => 'Upstream error');
            return new Response(text, { status: upstream.status });
        }

        // Pipe the upstream ReadableStream directly to the client
        return new Response(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering if behind a proxy
            },
        });
    } catch (error: any) {
        console.error('[SSE Proxy] Error connecting to backend stream:', error.message);
        return new Response(
            JSON.stringify({ error: 'Failed to connect to SSE stream' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } },
        );
    }
}
