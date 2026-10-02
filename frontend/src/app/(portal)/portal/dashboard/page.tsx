import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Dashboard | Portal",
};

/**
 * Hosteller Portal Dashboard — Phase 0 placeholder.
 * Full implementation in Phase 8.
 */
export default function PortalDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground">
          Your hostel portal. View your bills, payments, and room information below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Current Room", value: "—", href: "/portal/room" },
          { label: "Outstanding Bills", value: "—", href: "/portal/bills" },
          { label: "Last Payment", value: "—", href: "/portal/payments" },
          { label: "Security Deposit", value: "—", href: "#" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="block rounded-lg border bg-card p-6 shadow-sm transition-colors hover:bg-accent"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
