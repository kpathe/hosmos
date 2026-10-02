import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Portal",
};

/**
 * Hosteller portal shell layout.
 * Auth guard (redirect to login if not an active/exit_pending hosteller) will be
 * added in Phase 1 / Phase 8 when hosteller portal auth is implemented.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Portal top nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">Hosmos</span>
            <span className="text-sm text-muted-foreground">My Portal</span>
          </div>
          {/* User menu — added in Phase 8 */}
        </div>
      </header>

      {/* Portal content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
