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

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/calls`, {
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
    console.error("Error forwarding call request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate call" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const authToken = request.headers.get("authorization");
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/calls${searchParams ? `?${searchParams}` : ''}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Frontend-ID": "dev",
        "X-API-Key": process.env.BACKEND_API_KEY || "kMQgGRDAa8t5CvmkfqFYuGiXIXgNYC1EEGjYs5v8_NU",
        ...(authToken ? { Authorization: authToken } : {}),
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}