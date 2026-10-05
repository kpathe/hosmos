import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1";

export async function POST(request: NextRequest) {
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
      // Only delete the cookie if the backend explicitly rejected it (401/403).
      const errorRes = NextResponse.json(data, { status: response.status });
      if (response.status === 401 || response.status === 403) {
        errorRes.cookies.delete("hosmos_refresh_token");
      }
      return errorRes;
    }

    const { rawRefreshToken, access_token, user } = data.data;

    // Return the response without the raw refresh token
    const res = NextResponse.json(
      { data: { access_token, user } },
      { status: 200 }
    );

    // Attach cookie directly to the NextResponse object.
    // In Next.js 15, cookies().set() is dropped if you return a new NextResponse.json()
    const isHttps = request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
    res.cookies.set("hosmos_refresh_token", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return res;
  } catch (error) {
    console.error("[Refresh Proxy Error]:", error);
    return NextResponse.json(
      { error: { message: "Internal server error connecting to backend" } },
      { status: 500 }
    );
  }
}
