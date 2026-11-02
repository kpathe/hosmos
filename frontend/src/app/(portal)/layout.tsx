"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Receipt, BedDouble, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Portal Shell Navigation Items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href: "/portal/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: Home,
  },
  {
    href: "/portal/bills",
    label: "My Bills",
    shortLabel: "Bills",
    icon: Receipt,
  },
  {
    href: "/portal/room",
    label: "My Room",
    shortLabel: "Room",
    icon: BedDouble,
  },
  {
    href: "/portal/payments",
    label: "Payments",
    shortLabel: "Payments",
    icon: CreditCard,
  },
];

function PortalShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Nav (Desktop & Mobile Header) */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-primary">Hosmos</span>
            <span className="hidden text-sm text-muted-foreground sm:block">Resident Portal</span>
          </div>

          {/* Desktop Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <span className="text-xs sm:text-sm font-medium text-muted-foreground max-w-[120px] sm:max-w-none truncate">
                {user.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="gap-1.5 text-muted-foreground hover:text-destructive px-2 sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content (with bottom padding on mobile for sticky bottom navbar) */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:hidden shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-4 h-16 items-center px-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full transition-colors relative",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground active:text-primary"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
                <span className="text-[11px] leading-tight tracking-tight">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
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
