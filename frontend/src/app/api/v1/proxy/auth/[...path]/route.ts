import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  
  // Construct the backend URL
  // Example path: ["login", "owner"] -> "/auth/login/owner"
  const backendPath = `/auth/${path.join("/")}`;
  const backendUrl = `${BACKEND_BASE_URL}${backendPath}`;

  try {
    // Clone headers, stripping out host to prevent backend from getting confused
    const headers = new Headers(request.headers);
    headers.delete("host");

    // Forward the body
    const body = await request.text();

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: body || undefined,
    });

    // Create a new response with the backend's status and body
    const responseBody = await backendResponse.text();
    const response = new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    // Forward ALL headers from backend (crucially: Set-Cookie)
    backendResponse.headers.forEach((value, key) => {
      // Avoid forwarding content-encoding as Next.js will handle its own encoding
      if (key.toLowerCase() !== "content-encoding" && key.toLowerCase() !== "content-length") {
        response.headers.append(key, value);
      }
    });

    return response;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: { code: "PROXY_ERROR", message: "Failed to connect to backend API" } },
      { status: 502 }
    );
  }
}
