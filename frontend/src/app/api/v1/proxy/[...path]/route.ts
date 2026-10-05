import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Cookie parsing helper
//
// Parses a raw "Set-Cookie" string from a backend response into a structured
// object that NextResponse.cookies.set() can consume.
//
// Example input:
//   "hosmos_refresh_token=abc; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000"
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedCookie {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
  maxAge?: number;
}

function parseSetCookie(raw: string): ParsedCookie | null {
  const parts = raw.split(";").map((p) => p.trim());
  if (!parts[0]) return null;

  const eqIdx = parts[0].indexOf("=");
  if (eqIdx === -1) return null;

  const name = parts[0].substring(0, eqIdx).trim();
  const value = parts[0].substring(eqIdx + 1).trim();

  const cookie: ParsedCookie = { name, value };

  for (const attr of parts.slice(1)) {
    const [attrName, attrValue] = attr.split("=").map((p) => p.trim());
    const lower = (attrName ?? "").toLowerCase();

    if (lower === "httponly") cookie.httpOnly = true;
    else if (lower === "secure") cookie.secure = true;
    else if (lower === "path") cookie.path = attrValue;
    else if (lower === "max-age") cookie.maxAge = parseInt(attrValue ?? "0", 10);
    else if (lower === "samesite") {
      const sv = (attrValue ?? "").toLowerCase();
      if (sv === "strict" || sv === "lax" || sv === "none") {
        cookie.sameSite = sv;
      }
    }
    // Intentionally SKIP "domain" — setting domain=localhost can prevent
    // the browser from storing the cookie correctly in local dev.
    // The cookie will default to the proxy's origin (localhost:3000).
  }

  return cookie;
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal API proxy
//
// Forwards all HTTP methods to the Express backend.
// Correctly proxies cookies using NextResponse.cookies.set() (NOT
// response.headers.append("set-cookie", ...) which Next.js silently drops).
// ─────────────────────────────────────────────────────────────────────────────

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendPath = `/${path.join("/")}`;
  const backendUrl = `${BACKEND_BASE_URL}${backendPath}`;

  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${backendUrl}?${searchParams}` : backendUrl;

  try {
    // ── Build forwarded headers ────────────────────────────────────────────
    const headers = new Headers();

    const FORWARDED = ["content-type", "authorization", "x-hostel-id", "x-request-id"];
    for (const [key, value] of request.headers.entries()) {
      if (FORWARDED.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    // Forward the refresh token cookie so the backend can validate it.
    // Use NextRequest.cookies (typed API) to read cookies reliably.
    const refreshToken = request.cookies.get("hosmos_refresh_token")?.value;
    if (refreshToken) {
      headers.set("cookie", `hosmos_refresh_token=${refreshToken}`);
    }

    const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    const body = hasBody ? await request.text() : undefined;

    // ── Call backend ───────────────────────────────────────────────────────
    const backendResponse = await fetch(fullUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const responseBody = await backendResponse.text();

    // ── Build Next.js response ─────────────────────────────────────────────
    const response = new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    // Copy safe headers (skip ones Next.js manages, and skip set-cookie —
    // we handle cookies explicitly below to avoid the silent-drop bug).
    const SKIP_HEADERS = new Set([
      "content-encoding",
      "content-length",
      "transfer-encoding",
      "set-cookie",
    ]);
    for (const [key, value] of backendResponse.headers.entries()) {
      if (!SKIP_HEADERS.has(key.toLowerCase())) {
        response.headers.set(key, value);
      }
    }

    // ── Forward Set-Cookie using the typed cookies API ─────────────────────
    // response.headers.append("set-cookie", ...) is silently dropped by
    // Next.js App Router. Use response.cookies.set() instead.
    const rawCookies: string[] =
      typeof (backendResponse.headers as any).getSetCookie === "function"
        ? (backendResponse.headers as any).getSetCookie()
        : [backendResponse.headers.get("set-cookie")].filter(Boolean);

    for (const raw of rawCookies) {
      const parsed = parseSetCookie(raw);
      if (!parsed) continue;

      response.cookies.set(parsed.name, parsed.value, {
        httpOnly: parsed.httpOnly,
        secure: parsed.secure,
        sameSite: parsed.sameSite,
        path: parsed.path ?? "/",
        maxAge: parsed.maxAge,
      });
    }

    return response;
  } catch (error) {
    console.error(`[API Proxy] Error forwarding to ${fullUrl}:`, error);
    return NextResponse.json(
      { error: { code: "PROXY_ERROR", message: "Failed to connect to backend API" } },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
