"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, ShieldOff } from "lucide-react";
import type { UserRole } from "@hosmos/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, only these roles may access the route. */
  allowedRoles?: UserRole[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        {/* Spinning accent ring */}
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Restoring session…
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unauthorized Screen (wrong role)
// ─────────────────────────────────────────────────────────────────────────────

function UnauthorizedScreen() {
  const router = useRouter();
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <ShieldOff className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don&apos;t have permission to view this page. Please log in with an account that has the right role.
        </p>
      </div>
      <button
        onClick={() => router.push("/login")}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to Login
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthGuard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a route segment and enforces authentication + optional role checks.
 *
 * Behaviour:
 *   - While session is restoring → shows a loading screen (no flash of content)
 *   - If unauthenticated → redirects to /login?returnUrl=<current path>
 *   - If authenticated but wrong role → shows "Access Denied" then redirects
 */
export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Preserve the intended destination so login can redirect back
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Role mismatch — send to the appropriate dashboard for their role
      const fallback =
        user.role === "hosteller" ? "/portal/dashboard" : "/admin/dashboard";
      router.replace(fallback);
    }
  }, [user, isLoading, router, pathname, allowedRoles]);

  // ── Still checking session ──────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingScreen />;
  }

  // ── Not logged in (redirect pending) ───────────────────────────────────────
  if (!user) {
    return null;
  }

  // ── Wrong role (redirect pending) ──────────────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <UnauthorizedScreen />;
  }

  // ── Authorised ─────────────────────────────────────────────────────────────
  return <>{children}</>;
}
