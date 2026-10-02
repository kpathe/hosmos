import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Hosmos",
  description: "Register for the Hosmos hosteller portal.",
};

/**
 * Hosteller portal registration page — Phase 0 placeholder.
 * Full implementation in Phase 1 (auth module).
 *
 * Flow: hosteller enters their admission email + chosen username + password.
 * System finds their admitted record by email and activates their portal account.
 */
export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Create your account</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Use the email you provided at admission.
        </p>
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Registration form implemented in Phase 1.
          </p>
        </div>
      </div>
    </div>
  );
}
