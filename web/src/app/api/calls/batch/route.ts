import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3004";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const authToken = request.headers.get("authorization");

    // Forward the batch request to the backend
    const response = await fetch(`${BACKEND_URL}/calls/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frontend-ID": "dev",
        "X-API-Key": process.env.BACKEND_API_KEY || "kMQgGRDAa8t5CvmkfqFYuGiXIXgNYC1EEGjYs5v8_NU",
        ...(authToken ? { Authorization: authToken } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error forwarding batch call request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate batch calls" },
      { status: 500 }
    );
  }
}