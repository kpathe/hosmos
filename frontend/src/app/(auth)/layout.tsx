import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Hosmos",
  description: "Sign in to Hosmos to manage your hostel operations.",
};

/**
 * Auth layout — minimal, no sidebar, centered content.
 * Used for login and registration pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  );
}
