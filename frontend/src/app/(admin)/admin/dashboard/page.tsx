import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Admin Dashboard — Phase 0 placeholder.
 * Full implementation in Phase 2 (after auth + hostel APIs are complete).
 */
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Hosmos. Your hostel management overview will appear here.
        </p>
      </div>

      {/* Placeholder cards — replaced with real data in Phase 2+ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Hostellers", value: "—" },
          { label: "Occupied Rooms", value: "—" },
          { label: "Outstanding Bills", value: "—" },
          { label: "This Month Revenue", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Phase 0 scaffold complete. Admin modules are implemented in Phases 2–9.
        </p>
      </div>
    </div>
  );
}
