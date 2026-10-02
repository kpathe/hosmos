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

const API_BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1";

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

// Token provider — injected by the auth context at runtime
let getAccessToken: (() => string | null) | null = null;
let refreshTokenFn: (() => Promise<string | null>) | null = null;

export function configureApiClient(
  tokenGetter: () => string | null,
  tokenRefresher: () => Promise<string | null>
) {
  getAccessToken = tokenGetter;
  refreshTokenFn = tokenRefresher;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const token = getAccessToken?.();

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
  if (response.status === 401 && !_retried && refreshTokenFn) {
    const newToken = await refreshTokenFn();
    if (newToken) {
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
  async get<T>(path: string): Promise<T> {
    const res = await apiFetch<ApiSuccessResponse<T>>(path);
    return res.data;
  },

  /**
   * GET list request — returns data + meta from ApiCollectionResponse
   */
  async getList<T>(
    path: string
  ): Promise<ApiCollectionResponse<T>> {
    return apiFetch<ApiCollectionResponse<T>>(path);
  },

  /**
   * POST request
   */
  async post<TBody, TResponse>(path: string, body: TBody): Promise<TResponse> {
    const res = await apiFetch<ApiSuccessResponse<TResponse>>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data;
  },

  /**
   * PATCH request
   */
  async patch<TBody, TResponse>(path: string, body: TBody): Promise<TResponse> {
    const res = await apiFetch<ApiSuccessResponse<TResponse>>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.data;
  },

  /**
   * DELETE request
   */
  async delete<TResponse>(path: string): Promise<TResponse> {
    const res = await apiFetch<ApiSuccessResponse<TResponse>>(path, {
      method: "DELETE",
    });
    return res.data;
  },

  /**
   * Raw fetch — for custom cases (login, logout, register) where
   * the response shape is non-standard or caller needs full control.
   */
  raw: apiFetch,
};
