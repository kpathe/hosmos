"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Top bar — shown inside the admin shell
// ─────────────────────────────────────────────────────────────────────────────

function AdminTopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-foreground">Admin Panel</span>
        {user && (
          <span className="hidden text-xs text-muted-foreground sm:block">
            {user.role === "owner" ? "Owner" : "Manager"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
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
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Layout — guards owner/manager routes
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["owner", "manager"]}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <AdminSidebar />

        {/* Main content */}
        <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
          <AdminTopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/20">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
