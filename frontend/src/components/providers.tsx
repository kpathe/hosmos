"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect } from "react";
import { AuthProvider, useAuth, silentRefresh } from "@/contexts/auth-context";
import { configureApiClient } from "@/lib/api-client";
import { useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ApiClientConfigurator — wires the refresh function into the API client
// Must be a child of AuthProvider so it can access useAuth()
// ─────────────────────────────────────────────────────────────────────────────

function ApiClientConfigurator() {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;

  useEffect(() => {
    configureApiClient(
      // Token getter (legacy param — not used internally any more)
      () => authRef.current.accessToken,

      // Token refresher — called on 401
      async () => {
        const data = await silentRefresh();
        if (!data) return null;
        
        const newToken = data.access_token;
        // setAccessToken calls setModuleToken internally (auth-context.tsx)
        authRef.current.setAccessToken(newToken);
        return newToken;
      }
    );
  // Only configure once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Providers — wraps the entire app
// ─────────────────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 30 seconds for most data
            staleTime: 30_000,
            // Retry once on failure, with 1-second delay
            retry: 1,
            retryDelay: 1000,
            // Don't refetch on window focus
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientConfigurator />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
