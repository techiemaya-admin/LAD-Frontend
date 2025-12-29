import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    const agentId = req.nextUrl.searchParams.get("agentId");

    if (!url) {
      return NextResponse.json(
        { error: "Missing `url` parameter" },
        { status: 400 }
      );
    }

    let targetUrl = url;

    // If it's already a signed URL (storage.googleapis.com) or HTTP/HTTPS, use it directly
    if (url.includes("storage.googleapis.com") || url.startsWith("http://") || url.startsWith("https://")) {
      targetUrl = url;
    }
    // If gs:// → use backend's signing endpoint via agent API
    else if (url.startsWith("gs://")) {
      if (!agentId) {
        return NextResponse.json(
          { error: "Missing `agentId` parameter for gs:// URL" },
          { status: 400 }
        );
      }

      try {
        // Get auth token - try multiple sources
        const cookieStore = await cookies();
        let token = cookieStore.get("token")?.value;
        
        // Also check cookie header directly
        if (!token) {
          const cookieHeader = req.headers.get("cookie");
          if (cookieHeader) {
            const tokenMatch = cookieHeader.match(/token=([^;]+)/);
            if (tokenMatch) {
              token = tokenMatch[1];
            }
          }
        }
        
        // Check authorization header
        if (!token) {
          const authHeader = req.headers.get("authorization");
          if (authHeader) {
            token = authHeader.replace("Bearer ", "");
          }
        }

        // If still no token, try getting from query param as fallback
        if (!token) {
          token = req.nextUrl.searchParams.get("token") || undefined;
        }

        if (!token) {
          console.error("[recording-proxy] No token found in cookies, headers, or query params");
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        }

        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3004";
        const signingEndpoint = `${backendUrl}/api/voice-agent/agents/${agentId}/sample-signed-url`;

        const signingResp = await fetch(signingEndpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!signingResp.ok) {
          const errorData = await signingResp.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || 'Unknown error';
          console.error("[recording-proxy] Backend signing endpoint failed:", {
            status: signingResp.status,
            statusText: signingResp.statusText,
            error: errorMsg,
            fullResponse: errorData
          });
          throw new Error(`Signing service returned ${signingResp.status}: ${errorMsg}`);
        }

        const payload = await signingResp.json();

        // Backend returns signed_url at top level OR in data.signed_url
        targetUrl = payload?.signed_url || payload?.data?.signed_url;

        if (!targetUrl) {
          const errorMsg = `Invalid signing response: ${JSON.stringify(payload)}`;
          console.error("[recording-proxy] Missing signed_url in response:", payload);
          throw new Error(errorMsg);
        }
      } catch (err: any) {
        console.error("[recording-proxy] signing failed:", err);
        return NextResponse.json(
          { error: "Failed to sign gs:// URL", details: err.message },
          { status: 502 }
        );
      }
    }

    // Fetch audio binary with streaming support
    try {
      // Check if Range header is present (for streaming/partial content)
      const rangeHeader = req.headers.get("range");
      
      const fetchHeaders: HeadersInit = {
        'Accept': 'audio/*',
      };
      
      // Forward Range header for partial content requests (streaming)
      if (rangeHeader) {
        fetchHeaders['Range'] = rangeHeader;
      }

      const audioResp = await fetch(targetUrl, {
        headers: fetchHeaders,
      });

      if (!audioResp.ok) {
        // Don't log 206 (Partial Content) as error - it's expected for Range requests
        if (audioResp.status !== 206) {
          console.error("[recording-proxy] Failed to fetch audio", {
            url: targetUrl.substring(0, 100) + '...',
            status: audioResp.status,
            statusText: audioResp.statusText
          });
        }
        
        // For non-206 errors, return error response
        if (audioResp.status !== 206) {
          return NextResponse.json(
            {
              error: "Failed fetching audio",
              status: audioResp.status,
              url: targetUrl.substring(0, 100) + '...',
            },
            { status: audioResp.status }
          );
        }
      }

      // Stream the response instead of loading full file into memory
      const audioStream = audioResp.body;
      
      if (!audioStream) {
        return NextResponse.json(
          {
            error: "No audio stream received",
          },
          { status: 502 }
        );
      }

      // Determine content type
      const contentType =
        audioResp.headers.get("Content-Type") ||
        (targetUrl.endsWith(".mp3") && "audio/mpeg") ||
        (targetUrl.endsWith(".wav") && "audio/wav") ||
        (targetUrl.endsWith(".ogg") && "audio/ogg") ||
        "application/octet-stream";

      // Build response headers
      const responseHeaders: HeadersInit = {
        "Content-Type": contentType,
        // Cache signed URL content for 1 hour
        "Cache-Control": "public, max-age=3600",
        // CORS
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Accept-Ranges": "bytes",
      };

      // Forward content length if available
      const contentLength = audioResp.headers.get("Content-Length");
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
      }

      // Forward content range for partial content (206)
      if (audioResp.status === 206) {
        const contentRange = audioResp.headers.get("Content-Range");
        if (contentRange) {
          responseHeaders["Content-Range"] = contentRange;
        }
        responseHeaders["Content-Length"] = audioResp.headers.get("Content-Length") || "0";
      }

      // Return streaming response
      return new NextResponse(audioStream, {
        status: audioResp.status === 206 ? 206 : 200,
        headers: responseHeaders,
      });
    } catch (fetchError: any) {
      console.error("[recording-proxy] Error fetching audio", {
        error: fetchError.message,
        url: targetUrl.substring(0, 100) + '...'
      });
      return NextResponse.json(
        {
          error: "Failed to fetch audio",
          details: fetchError.message,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error("[recording-proxy] Top-level error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
