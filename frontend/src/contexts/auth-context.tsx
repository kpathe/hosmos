"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { UserRole } from "@hosmos/types";
import { setModuleToken } from "@/lib/api-client";

// ─────────────────────────────────────────────────────────────────────────────
// Auth State Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hostel_id?: string; // Present for hostellers only
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean; // True during initial session restore
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Module-level restore flag
//
// React 18 Strict Mode (dev) double-invokes effects: mount → unmount → mount.
// Both invocations fire the refresh endpoint at the same time. The first call
// succeeds and rotates the token. The second call sends the same (now-revoked)
// token and gets "Invalid or expired refresh token", logging the user out.
//
// Fix: a module-level promise that all concurrent restoreSession calls share.
// Only one HTTP request is ever made; all callers await the same result.
// ─────────────────────────────────────────────────────────────────────────────

let _restorePromise: Promise<{ access_token: string; user: AuthUser } | null> | null = null;

async function silentRefresh(): Promise<{ access_token: string; user: AuthUser } | null> {
  if (_restorePromise) return _restorePromise;

  _restorePromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        data: { access_token: string; user: AuthUser };
      };
      return data.data;
    } catch {
      return null;
    } finally {
      // Clear after a tick so the promise is reusable on next page load
      setTimeout(() => { _restorePromise = null; }, 0);
    }
  })();

  return _restorePromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true, // Start loading until we attempt token refresh
  });

  /**
   * On mount: attempt silent token refresh using the HttpOnly cookie.
   * This restores the session across page refreshes without needing localStorage.
   * Uses a shared promise to prevent Strict Mode from firing two refresh requests.
   */
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const data = await silentRefresh();

      if (cancelled) return;

      if (data) {
        setModuleToken(data.access_token); // Keep module-level token in sync
        setState({ user: data.user, accessToken: data.access_token, isLoading: false });
      } else {
        setModuleToken(null);
        setState({ user: null, accessToken: null, isLoading: false });
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    setModuleToken(token);
    setState({ user, accessToken: token, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: state.accessToken
          ? { Authorization: `Bearer ${state.accessToken}` }
          : {},
      });
    } catch {
      // Ignore errors — clear session regardless
    } finally {
      setModuleToken(null);
      setState({ user: null, accessToken: null, isLoading: false });
    }
  }, [state.accessToken]);

  const setAccessToken = useCallback((token: string) => {
    setModuleToken(token); // Always sync module-level token immediately
    setState((prev) => ({ ...prev, accessToken: token }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, setAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

/**
 * Returns true if the current user has the given role.
 */
export function useHasRole(role: UserRole): boolean {
  const { user } = useAuth();
  return user?.role === role;
}
