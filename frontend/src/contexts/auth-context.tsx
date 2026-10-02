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
   */
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const res = await fetch("/api/proxy/auth/refresh", {
          method: "POST",
          credentials: "include", // Send the HttpOnly refresh token cookie
        });

        if (!cancelled && res.ok) {
          const data = (await res.json()) as {
            data: { access_token: string; user: AuthUser };
          };
          setState({
            user: data.data.user,
            accessToken: data.data.access_token,
            isLoading: false,
          });
        } else if (!cancelled) {
          setState({ user: null, accessToken: null, isLoading: false });
        }
      } catch {
        if (!cancelled) {
          setState({ user: null, accessToken: null, isLoading: false });
        }
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    setState({ user, accessToken: token, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/proxy/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: state.accessToken
          ? { Authorization: `Bearer ${state.accessToken}` }
          : {},
      });
    } catch {
      // Ignore errors — clear session regardless
    } finally {
      setState({ user: null, accessToken: null, isLoading: false });
    }
  }, [state.accessToken]);

  const setAccessToken = useCallback((token: string) => {
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
