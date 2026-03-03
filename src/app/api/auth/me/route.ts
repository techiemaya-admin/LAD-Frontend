import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "../../utils/backend";
export async function GET(req: NextRequest) {
  try {
    // Try to get token from Authorization header first, then fall back to cookies
    const authHeader = req.headers.get("Authorization");
    let token = authHeader?.replace("Bearer ", "");
    if (!token) {
      token = req.cookies.get("token")?.value || req.cookies.get("access_token")?.value;
    }
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const backend = getBackendUrl();
    const resp = await fetch(`${backend}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: "Failed to fetch user data", details: errorText },
        { status: resp.status },
      );
    }
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", details: e?.message },
      { status: 500 },
    );
  }
}
