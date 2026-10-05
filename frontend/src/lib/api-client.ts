import type {
  ApiSuccessResponse,
  ApiCollectionResponse,
  ApiErrorResponse,
} from "@hosmos/types";

// ─────────────────────────────────────────────────────────────────────────────
// API Client
//
// Typed wrapper around fetch that handles:
//   - Base URL from environment
//   - Authorization header injection
//   - Automatic 401 → token refresh → retry flow
//   - Typed response parsing
//   - Error normalization to ApiClientError
// ─────────────────────────────────────────────────────────────────────────────

// ── Base URL ─────────────────────────────────────────────────────────────────
// In the browser we always route through the Next.js proxy (/api/v1/proxy/*).
// This keeps requests same-origin so the HttpOnly refresh-token cookie
// is sent automatically without CORS or SameSite issues.
// The proxy forwards everything to the real backend.
const API_BASE_URL =
  typeof window === "undefined"
    ? (process.env.BACKEND_URL ?? "http://localhost:3001/api/v1") // server-side (SSR)
    : "/api/v1/proxy"; // client-side: always use the local Next.js proxy

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token storage
//
// We keep the latest access token in a module-level variable (NOT React state)
// so the retry path in apiFetch can read the freshly-refreshed token without
// waiting for React's async setState to propagate. This is the root cause of
// the "logged out before token expires" bug: the retry re-read getAccessToken()
// from the React closure which still held the OLD expired token, causing a
// second 401 that triggered UNAUTHORIZED → logout.
//
// The React context (AuthContext) is still the source of truth for the UI:
//  - login / logout / initial restore update context state → _latestToken
//  - setAccessToken (called after silent refresh) also updates → _latestToken
// ─────────────────────────────────────────────────────────────────────────────

let _latestToken: string | null = null;
let _refreshFn: (() => Promise<string | null>) | null = null;
// Module-level lock to prevent concurrent refresh races
let _refreshPromise: Promise<string | null> | null = null;

/**
 * Called by AuthProvider on every token change.
 * Keeps our module-level mirror in sync with React state.
 */
export function setModuleToken(token: string | null) {
  _latestToken = token;
}

export function configureApiClient(
  _tokenGetter: () => string | null, // kept for signature compat, not used internally
  tokenRefresher: () => Promise<string | null>
) {
  _refreshFn = tokenRefresher;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const token = _latestToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // Required for HttpOnly refresh token cookie
  });

  // ── 401: try one token refresh then retry ─────────────────────────────────
  if (response.status === 401 && !_retried && _refreshFn) {
    // Deduplicate concurrent refresh calls
    if (!_refreshPromise) {
      _refreshPromise = _refreshFn().finally(() => {
        _refreshPromise = null;
      });
    }

    const newToken = await _refreshPromise;
    if (newToken) {
      // _latestToken is already updated by setModuleToken inside refreshFn
      return apiFetch<T>(path, options, true);
    }
    // Refresh failed — throw auth error
    throw new ApiClientError("UNAUTHORIZED", "Session expired. Please log in again.", 401);
  }

  // ── Parse response ────────────────────────────────────────────────────────
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (isJson) {
      const errorBody = (await response.json()) as ApiErrorResponse;
      throw new ApiClientError(
        errorBody.error.code,
        errorBody.error.message,
        response.status,
        errorBody.error.details
      );
    }
    throw new ApiClientError("REQUEST_FAILED", `Request failed: ${response.statusText}`, response.status);
  }

  if (!isJson) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API methods
// ─────────────────────────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * GET request — returns the inner `data` field of ApiSuccessResponse
   */
  async get<T>(path: string, customHeaders?: Record<string, string>): Promise<T> {
    const res = await apiFetch<ApiSuccessResponse<T>>(path, { headers: customHeaders });
    return res.data;
  },

  /**
   * GET list request — returns data + meta from ApiCollectionResponse
   */
  async getList<T>(
    path: string,
    customHeaders?: Record<string, string>
  ): Promise<ApiCollectionResponse<T>> {
    return apiFetch<ApiCollectionResponse<T>>(path, { headers: customHeaders });
  },

  /**
   * POST request
   */
  async post<TBody, TResponse>(path: string, body: TBody, customHeaders?: Record<string, string>): Promise<TResponse> {
    const res = await apiFetch<ApiSuccessResponse<TResponse>>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: customHeaders,
    });
    return res.data;
  },

  /**
   * PATCH request
   */
  async patch<TBody, TResponse>(path: string, body: TBody, customHeaders?: Record<string, string>): Promise<TResponse> {
    const res = await apiFetch<ApiSuccessResponse<TResponse>>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: customHeaders,
    });
    return res.data;
  },

  /**
   * DELETE request
   */
  async delete<TResponse>(path: string, customHeaders?: Record<string, string>): Promise<TResponse> {
    const res = await apiFetch<ApiSuccessResponse<TResponse>>(path, {
      method: "DELETE",
      headers: customHeaders,
    });
    return res.data;
  },

  /**
   * Raw fetch — for custom cases (login, logout, register) where
   * the response shape is non-standard or caller needs full control.
   */
  raw: apiFetch,
};
