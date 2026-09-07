import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { cookies } from "next/headers";

/**
 * Recording proxy — streams call-recording / voice-sample audio from GCS.
 *
 * Accepts EXACTLY two URL shapes, because that is all any caller sends
 * (AgentAudioPlayer, VoicePreview, CallConfiguration, exportToExcel — every one
 * builds either a gs:// URL or a storage.googleapis.com signed/public URL):
 *
 *   gs://bucket/object                      → public-HEAD probe, else backend
 *                                             stream (token-authenticated there)
 *   https://storage.googleapis.com/…        → fetched directly (signed URLs
 *                                             carry their own auth in the query)
 *
 * Everything else is refused. This route USED to accept any http(s) URL and
 * stream the response back with CORS *, which made the site an unauthenticated
 * open web proxy — confirmed live with ?url=https://example.com/ returning that
 * page's HTML to an anonymous caller. No caller ever needed that branch.
 *
 * The route itself stays public (it is listed in OPEN_ROUTES.public and voice
 * previews play on pages without a session): the host lock, not a login wall,
 * is what closes the proxy hole. A public GCS object fetched through here is
 * one the caller could fetch from GCS directly anyway.
 */

/** The only upstream host recordings live on. Exact match — never substring. */
const GCS_HOST = "storage.googleapis.com";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json(
        { error: "Missing `url` parameter" },
        { status: 400 }
      );
    }

    let targetUrl: string;

    if (url.startsWith("gs://")) {
      // Step 1: Try public GCS HTTPS URL (fast path - works if bucket/object is public)
      const publicUrl = "https://storage.googleapis.com/" + url.slice("gs://".length);
      let resolved = false;
      try {
        const headResp = await fetch(publicUrl, { method: "HEAD" });
        if (headResp.ok) {
          targetUrl = publicUrl;
          resolved = true;
        }
      } catch {
        // Not public - fall through to backend streaming
      }

      if (!resolved) {
        // Step 2: Route through backend GCS streaming endpoint
        // The backend uses GCS SDK (ADC / service account) to stream the file.
        // This works in dev (gcloud ADC) and prod (Cloud Run service account).
        const cookieStore = await cookies();
        let token = cookieStore.get("token")?.value;

        if (!token) {
          const cookieHeader = req.headers.get("cookie");
          if (cookieHeader) {
            const m = cookieHeader.match(/token=([^;]+)/);
            if (m) token = m[1];
          }
        }
        if (!token) {
          const auth = req.headers.get("authorization");
          if (auth) token = auth.replace("Bearer ", "");
        }
        if (!token) {
          token = req.nextUrl.searchParams.get("token") || undefined;
        }
        if (!token) {
          logger.error('[recording-proxy] No token found for gs:// URL');
          return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const streamEndpoint = `${backendUrl}/api/voice-agent/recordings/stream?url=${encodeURIComponent(url)}`;

        // Forward Range header so the backend can handle partial content (audio seeking)
        const rangeHeader = req.headers.get("range");
        const backendHeaders: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };
        if (rangeHeader) backendHeaders['Range'] = rangeHeader;

        try {
          const backendResp = await fetch(streamEndpoint, { headers: backendHeaders });

          if (!backendResp.ok && backendResp.status !== 206) {
            const body = await backendResp.json().catch(() => ({}));
            logger.error('[recording-proxy] Backend stream failed', {
              status: backendResp.status,
              error: body.error || body.message,
            });
            return NextResponse.json(
              { error: "Backend stream failed", details: body.error || body.message },
              { status: backendResp.status }
            );
          }

          // Stream the backend response directly to the browser
          const responseHeaders: HeadersInit = {
            "Content-Type": backendResp.headers.get("Content-Type") || "audio/ogg",
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
          };
          const contentLength = backendResp.headers.get("Content-Length");
          if (contentLength) responseHeaders["Content-Length"] = contentLength;
          const contentRange = backendResp.headers.get("Content-Range");
          if (contentRange) responseHeaders["Content-Range"] = contentRange;

          return new NextResponse(backendResp.body, {
            status: backendResp.status,
            headers: responseHeaders,
          });
        } catch (err: any) {
          logger.error('[recording-proxy] Backend stream request error', { error: err.message });
          return NextResponse.json(
            { error: "Failed to stream from backend", details: err.message },
            { status: 502 }
          );
        }
      }
    } else {
      // The https form. Parse rather than substring-match: the old
      // `url.includes("storage.googleapis.com")` classifier would have passed
      // https://evil.example/storage.googleapis.com too.
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      if (parsed.protocol !== "https:" || parsed.hostname !== GCS_HOST) {
        return NextResponse.json(
          { error: "Only gs:// and https://storage.googleapis.com URLs are supported" },
          { status: 400 }
        );
      }
      targetUrl = parsed.toString();
    }

    // Fetch directly from targetUrl (public/signed GCS HTTPS URL)
    const rangeHeader = req.headers.get("range");
    const fetchHeaders: HeadersInit = { 'Accept': 'audio/*' };
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

    try {
      const audioResp = await fetch(targetUrl!, { headers: fetchHeaders });

      if (!audioResp.ok && audioResp.status !== 206) {
        logger.error('[recording-proxy] Failed to fetch audio', {
          url: targetUrl!.substring(0, 100),
          status: audioResp.status,
        });
        return NextResponse.json(
          { error: "Failed fetching audio", status: audioResp.status },
          { status: audioResp.status }
        );
      }

      const audioStream = audioResp.body;
      if (!audioStream) {
        return NextResponse.json({ error: "No audio stream received" }, { status: 502 });
      }

      const contentType =
        audioResp.headers.get("Content-Type") ||
        (targetUrl!.endsWith(".mp3") ? "audio/mpeg" :
         targetUrl!.endsWith(".wav") ? "audio/wav" :
         targetUrl!.endsWith(".ogg") ? "audio/ogg" :
         "application/octet-stream");

      const responseHeaders: HeadersInit = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      };
      const contentLength = audioResp.headers.get("Content-Length");
      if (contentLength) responseHeaders["Content-Length"] = contentLength;
      if (audioResp.status === 206) {
        const contentRange = audioResp.headers.get("Content-Range");
        if (contentRange) responseHeaders["Content-Range"] = contentRange;
        responseHeaders["Content-Length"] = audioResp.headers.get("Content-Length") || "0";
      }

      return new NextResponse(audioStream, {
        status: audioResp.status === 206 ? 206 : 200,
        headers: responseHeaders,
      });
    } catch (fetchError: any) {
      logger.error('[recording-proxy] Error fetching audio', { error: fetchError.message });
      return NextResponse.json(
        { error: "Failed to fetch audio", details: fetchError.message },
        { status: 502 }
      );
    }
  } catch (err: any) {
    logger.error('[recording-proxy] Top-level error', err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
