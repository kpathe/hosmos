"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { RegisterHostellerRequest } from "@hosmos/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const registerHostellerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password_plain: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.password_plain === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type RegisterFormData = z.infer<typeof registerHostellerSchema>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerHostellerSchema),
    defaultValues: { email: "", username: "", password_plain: "", confirm_password: "" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMsg(null);
    try {
      const payload: RegisterHostellerRequest = {
        email: data.email,
        username: data.username,
        password_plain: data.password_plain,
      };

      const res = await fetch("/api/v1/proxy/auth/register/hosteller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || "Registration failed");
      }

      setSuccess(true);
      // Wait a moment then redirect to login
      setTimeout(() => {
        router.push("/login?tab=hosteller");
      }, 3000);
      
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 md:p-24">
      <div className="w-full max-w-112.5">
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Use the email you provided at admission to activate your portal access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="rounded-lg bg-green-500/15 p-6 text-center text-green-700 dark:text-green-400">
                <h3 className="mb-2 text-lg font-semibold">Account Activated!</h3>
                <p className="text-sm">You can now log in to the resident portal. Redirecting...</p>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Admission Email</Label>
                  <Input id="email" type="email" {...form.register("email")} placeholder="johndoe@example.com" />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Choose a Username</Label>
                  <Input id="username" {...form.register("username")} placeholder="johndoe99" />
                  {form.formState.errors.username && (
                    <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_plain">Password</Label>
                  <Input id="password_plain" type="password" {...form.register("password_plain")} />
                  {form.formState.errors.password_plain && (
                    <p className="text-xs text-destructive">{form.formState.errors.password_plain.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <Input id="confirm_password" type="password" {...form.register("confirm_password")} />
                  {form.formState.errors.confirm_password && (
                    <p className="text-xs text-destructive">{form.formState.errors.confirm_password.message}</p>
                  )}
                </div>
                
                {errorMsg && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{errorMsg}</div>}
                
                <Button type="submit" className="w-full mt-4" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Activating..." : "Activate Account"}
                </Button>
              </form>
            )}
          </CardContent>
          {!success && (
            <CardFooter className="flex justify-center border-t p-4">
              <p className="text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
