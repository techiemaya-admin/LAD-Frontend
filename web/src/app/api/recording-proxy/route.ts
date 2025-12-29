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

    // If it's already a signed URL (storage.googleapis.com), use it directly
    if (url.includes("storage.googleapis.com")) {
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

    // Fetch audio binary
    const audioResp = await fetch(targetUrl);

    if (!audioResp.ok) {
      return NextResponse.json(
        {
          error: "Failed fetching audio",
          status: audioResp.status,
        },
        { status: audioResp.status }
      );
    }

    const audioBuffer = await audioResp.arrayBuffer();

    const contentType =
      audioResp.headers.get("Content-Type") ||
      (targetUrl.endsWith(".mp3") && "audio/mpeg") ||
      (targetUrl.endsWith(".wav") && "audio/wav") ||
      (targetUrl.endsWith(".ogg") && "audio/ogg") ||
      "application/octet-stream";

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length":
          audioResp.headers.get("Content-Length") ||
          String(audioBuffer.byteLength),

        // Cache signed URL content for 1 hour
        "Cache-Control": "public, max-age=3600",

        // CORS
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
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
