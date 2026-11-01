import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hosmos — Modern Hostel Management",
  description:
    "Hosmos digitizes hostel admissions, billing, electricity tracking, and resident communication. A complete hostel management platform.",
};

/**
 * Public landing page.
 * Full design implemented once all phases are complete.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold">Hosmos</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Admin Login
            </Link>
            <Link
              href="/portal/dashboard"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              My Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight">
            Hostel management,{" "}
            <span className="text-primary">simplified</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Hosmos replaces paper records with a structured, auditable digital
            system — admissions, billing, electricity tracking, and resident
            communication in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
            >
              Go to Admin Panel
            </Link>
            <Link
              href="/register"
              className="rounded-md border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted"
            >
              Hosteller Registration
            </Link>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Admission & Room Management",
                desc: "Atomically admit hostellers with prorated billing and advance rent allocation.",
              },
              {
                title: "Monthly Billing",
                desc: "Generate accurate bills with advance credits, electricity, and adjustments.",
              },
              {
                title: "Electricity Tracking",
                desc: "Record sub-meter readings monthly and split costs among room occupants.",
              },
              {
                title: "Payment Records",
                desc: "Record cash, cheque, and UPI payments with a permanent audit trail.",
              },
              {
                title: "Exit Settlement",
                desc: "Process departures with automatic security deposit reconciliation.",
              },
              {
                title: "Resident Portal",
                desc: "Hostellers self-register and view their own bills, payments, and room details.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
