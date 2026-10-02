import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

/**
 * Admin shell layout.
 * Auth guard (redirect to login if not owner/manager) will be added in Phase 1
 * when the auth middleware is implemented.
 *
 * This layout wraps all /admin/* routes and will host the sidebar and
 * navigation chrome once Phase 1 is complete.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar — implemented in Phase 1 */}
      <aside
        id="admin-sidebar"
        className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col"
      >
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold tracking-tight">Hosmos</span>
        </div>
        {/* Navigation links — added in Phase 1 */}
        <nav className="flex-1 space-y-1 p-4">
          <p className="text-sm text-muted-foreground">
            Admin navigation — Phase 1
          </p>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — implemented in Phase 1 */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button — Phase 1 */}
            <span className="font-semibold text-foreground">Admin Panel</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
