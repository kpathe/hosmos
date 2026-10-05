import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const { role } = await params;
    const body = await request.text();

    const response = await fetch(`${BACKEND_BASE_URL}/auth/login/${role}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const { rawRefreshToken, access_token, user } = data.data;

    // Set HttpOnly refresh token cookie securely via Next.js
    const cookieStore = await cookies();
    cookieStore.set("hosmos_refresh_token", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Better for auth flow redirects
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Return the response without the raw refresh token
    return NextResponse.json(
      { data: { access_token, user } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Login Proxy Error]:", error);
    return NextResponse.json(
      { error: { message: "Internal server error connecting to backend" } },
      { status: 500 }
    );
  }
}
