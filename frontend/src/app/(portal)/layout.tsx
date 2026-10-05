"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Receipt, BedDouble } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Portal Shell
// ─────────────────────────────────────────────────────────────────────────────

function PortalShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-primary">Hosmos</span>
            <span className="hidden text-sm text-muted-foreground sm:block">My Portal</span>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/portal/dashboard"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/portal/bills"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Receipt className="h-4 w-4" />
              My Bills
            </Link>
            <Link
              href="/portal/room"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BedDouble className="h-4 w-4" />
              My Room
            </Link>
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout — guards hosteller-only routes
// ─────────────────────────────────────────────────────────────────────────────

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={["hosteller"]}>
      <PortalShell>{children}</PortalShell>
    </AuthGuard>
  );
}
