import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("hosmos_refresh_token")?.value;
    
    // Attempt to log out on the backend if we have a refresh token
    if (refreshToken) {
      const authHeader = request.headers.get("authorization");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authHeader) {
        headers["authorization"] = authHeader;
      }

      await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }

    // Always delete the cookie from the browser
    cookieStore.delete("hosmos_refresh_token");

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (error) {
    console.error("[Logout Proxy Error]:", error);
    // Even on error, attempt to clear the cookie
    const cookieStore = await cookies();
    cookieStore.delete("hosmos_refresh_token");
    
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
