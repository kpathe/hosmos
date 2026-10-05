import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("hosmos_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: { message: "No refresh token provided" } },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If refresh failed, delete the old cookie so we don't keep retrying it
      cookieStore.delete("hosmos_refresh_token");
      return NextResponse.json(data, { status: response.status });
    }

    const { rawRefreshToken, access_token, user } = data.data;

    // Set new HttpOnly refresh token cookie
    cookieStore.set("hosmos_refresh_token", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Return the response without the raw refresh token
    return NextResponse.json(
      { data: { access_token, user } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Refresh Proxy Error]:", error);
    return NextResponse.json(
      { error: { message: "Internal server error connecting to backend" } },
      { status: 500 }
    );
  }
}
