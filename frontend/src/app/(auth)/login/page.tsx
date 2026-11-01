"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { LoginResponse, UserRole } from "@hosmos/types";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const loginHostellerSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  password_plain: z.string().min(1, "Password is required"),
});

const loginManagerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password_plain: z.string().min(1, "Password is required"),
});

const loginOwnerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password_plain: z.string().min(1, "Password is required"),
});

// ─── Component ──────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { login } = useAuth();
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Forms
  const hostellerForm = useForm<z.infer<typeof loginHostellerSchema>>({
    resolver: zodResolver(loginHostellerSchema),
    defaultValues: { identifier: "", password_plain: "" },
  });

  const managerForm = useForm<z.infer<typeof loginManagerSchema>>({
    resolver: zodResolver(loginManagerSchema),
    defaultValues: { username: "", password_plain: "" },
  });

  const ownerForm = useForm<z.infer<typeof loginOwnerSchema>>({
    resolver: zodResolver(loginOwnerSchema),
    defaultValues: { email: "", password_plain: "" },
  });

  const handleLogin = async (
    role: "hosteller" | "manager" | "owner",
    data: any
  ) => {
    setErrorMsg(null);
    try {
      const endpoint = `/api/auth/login/${role}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || "Login failed");
      }

      const loginData = result.data as LoginResponse;
      login(loginData.access_token, loginData.user);

      // Route to correct dashboard
      if (returnUrl) {
        router.replace(returnUrl);
      } else if (role === "hosteller") {
        router.replace("/portal/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 md:p-24">
      <div className="w-full max-w-[450px]">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Hosmos</h1>
          <p className="mt-2 text-sm text-muted-foreground">The intelligent hostel management system.</p>
        </div>

        <Tabs defaultValue="hosteller" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="hosteller">Hosteller</TabsTrigger>
            <TabsTrigger value="manager">Manager</TabsTrigger>
            <TabsTrigger value="owner">Owner</TabsTrigger>
          </TabsList>

          {/* HOSTELLER TAB */}
          <TabsContent value="hosteller">
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Resident Portal</CardTitle>
                <CardDescription>
                  Sign in to view your bills, payments, and room info.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={hostellerForm.handleSubmit((d) => handleLogin("hosteller", d))} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="h-identifier">Username or Email</Label>
                    <Input id="h-identifier" {...hostellerForm.register("identifier")} placeholder="johndoe" />
                    {hostellerForm.formState.errors.identifier && (
                      <p className="text-xs text-destructive">{hostellerForm.formState.errors.identifier.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="h-password">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input id="h-password" type="password" {...hostellerForm.register("password_plain")} />
                    {hostellerForm.formState.errors.password_plain && (
                      <p className="text-xs text-destructive">{hostellerForm.formState.errors.password_plain.message}</p>
                    )}
                  </div>
                  
                  {errorMsg && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{errorMsg}</div>}
                  
                  <Button type="submit" className="w-full mt-4" disabled={hostellerForm.formState.isSubmitting}>
                    {hostellerForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center border-t p-4">
                <p className="text-sm text-muted-foreground">
                  New resident? <Link href="/register" className="text-primary font-medium hover:underline">Register your account</Link>
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* MANAGER TAB */}
          <TabsContent value="manager">
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Manager Access</CardTitle>
                <CardDescription>
                  Sign in to manage admissions, billing, and records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={managerForm.handleSubmit((d) => handleLogin("manager", d))} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="m-username">Manager Username/Email</Label>
                    <Input id="m-username" {...managerForm.register("username")} placeholder="manager@hostel.com" />
                    {managerForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{managerForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="m-password">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input id="m-password" type="password" {...managerForm.register("password_plain")} />
                    {managerForm.formState.errors.password_plain && (
                      <p className="text-xs text-destructive">{managerForm.formState.errors.password_plain.message}</p>
                    )}
                  </div>
                  
                  {errorMsg && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{errorMsg}</div>}
                  
                  <Button type="submit" className="w-full mt-4" disabled={managerForm.formState.isSubmitting}>
                    {managerForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OWNER TAB */}
          <TabsContent value="owner">
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Owner Access</CardTitle>
                <CardDescription>
                  Sign in to your administration dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={ownerForm.handleSubmit((d) => handleLogin("owner", d))} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="o-email">Owner Email</Label>
                    <Input id="o-email" type="email" {...ownerForm.register("email")} placeholder="owner@hostel.com" />
                    {ownerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{ownerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="o-password">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input id="o-password" type="password" {...ownerForm.register("password_plain")} />
                    {ownerForm.formState.errors.password_plain && (
                      <p className="text-xs text-destructive">{ownerForm.formState.errors.password_plain.message}</p>
                    )}
                  </div>
                  
                  {errorMsg && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{errorMsg}</div>}
                  
                  <Button type="submit" className="w-full mt-4" disabled={ownerForm.formState.isSubmitting}>
                    {ownerForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex w-full items-center justify-center p-24">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
