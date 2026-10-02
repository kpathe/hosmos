"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { configureApiClient } from "@/lib/api-client";

// ─────────────────────────────────────────────────────────────────────────────
// ApiClientConfigurator — wires the auth context into the API client
// Must be a child of AuthProvider so it can access useAuth()
// ─────────────────────────────────────────────────────────────────────────────

function ApiClientConfigurator() {
  const { accessToken } = useAuth();

  useEffect(() => {
    configureApiClient(
      // Token getter — called before every request
      () => accessToken,
      // Token refresher — called on 401; fetches new token via cookie
      async () => {
        try {
          const res = await fetch("/api/proxy/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          if (!res.ok) return null;
          const data = (await res.json()) as {
            data: { access_token: string };
          };
          return data.data.access_token;
        } catch {
          return null;
        }
      }
    );
  }, [accessToken]);

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
            // Don't refetch on window focus for financial data (prevents surprises)
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
