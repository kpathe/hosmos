import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Hosmos",
};

/**
 * Login page — Phase 0 placeholder.
 * Full implementation (separate tabs for Owner, Manager, Hosteller) in Phase 1.
 */
export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold">Sign in</h2>
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Login form will be implemented in Phase 1.
          </p>
        </div>
      </div>
    </div>
  );
}
