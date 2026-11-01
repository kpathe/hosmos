"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ForgotPasswordRequest, ResetPasswordRequest } from "@hosmos/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, KeyRound, Lock, ArrowRight, RotateCcw, CheckCircle2, ArrowLeft } from "lucide-react";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const requestOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  otp: z.string().length(6, "Reset code must be exactly 6 digits").regex(/^\d+$/, "Code must contain numbers only"),
  new_password_plain: z.string().min(8, "New password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.new_password_plain === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type RequestOtpFormData = z.infer<typeof requestOtpSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const emailForm = useForm<RequestOtpFormData>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: "", new_password_plain: "", confirm_password: "" },
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendOtp = async (email: string) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSending(true);

    try {
      const payload: ForgotPasswordRequest = { email };
      const res = await fetch("/api/v1/proxy/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to send reset code");
      }

      setTargetEmail(email);
      setCooldown(json.data?.cooldown_seconds || 60);
      setInfoMsg(json.data?.message || `A verification code has been sent to ${email}`);
      setStep("otp");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset code");
    } finally {
      setIsSending(false);
    }
  };

  const onEmailSubmit = async (data: RequestOtpFormData) => {
    await handleSendOtp(data.email);
  };

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const payload: ResetPasswordRequest = {
        email: targetEmail,
        otp: data.otp,
        new_password_plain: data.new_password_plain,
      };

      const res = await fetch("/api/v1/proxy/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || "Password reset failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Password reset failed");
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 md:p-24">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-card/90 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                Password Recovery
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {step === "email" ? "Reset your password" : "Enter verification code"}
            </CardTitle>
            <CardDescription className="text-sm">
              {step === "email"
                ? "Enter your account email to receive a 6-digit password reset code."
                : `Enter the code sent to ${targetEmail} and choose a new password.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {success ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center text-emerald-700 dark:text-emerald-400 space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce" />
                <h3 className="text-lg font-bold">Password Reset Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. Redirecting to login...
                </p>
              </div>
            ) : step === "email" ? (
              /* Step 1: Request Code */
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Account Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      className="pl-9"
                      {...emailForm.register("email")}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 rounded-xl mt-2"
                  disabled={isSending || emailForm.formState.isSubmitting}
                >
                  {isSending ? "Sending code..." : "Send Verification Code"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              /* Step 2: Verify & Set New Password */
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <div className="flex items-center justify-between text-xs bg-muted/60 p-2.5 rounded-xl border">
                  <span className="text-muted-foreground truncate max-w-[220px]">
                    To: <strong className="text-foreground">{targetEmail}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="text-primary hover:underline font-medium ml-2 shrink-0"
                  >
                    Change Email
                  </button>
                </div>

                {infoMsg && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs rounded-xl">
                    {infoMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="otp" className="text-sm font-medium">
                      6-Digit Verification Code
                    </Label>
                    <button
                      type="button"
                      disabled={cooldown > 0 || isSending}
                      onClick={() => handleSendOtp(targetEmail)}
                      className="text-xs text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      className="pl-9 font-mono tracking-widest text-base"
                      {...resetForm.register("otp")}
                    />
                  </div>
                  {resetForm.formState.errors.otp && (
                    <p className="text-xs text-destructive">{resetForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password_plain" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new_password_plain"
                      type="password"
                      placeholder="Minimum 8 characters"
                      className="pl-9"
                      {...resetForm.register("new_password_plain")}
                    />
                  </div>
                  {resetForm.formState.errors.new_password_plain && (
                    <p className="text-xs text-destructive">
                      {resetForm.formState.errors.new_password_plain.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Repeat new password"
                      className="pl-9"
                      {...resetForm.register("confirm_password")}
                    />
                  </div>
                  {resetForm.formState.errors.confirm_password && (
                    <p className="text-xs text-destructive">
                      {resetForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 rounded-xl mt-2"
                  disabled={resetForm.formState.isSubmitting}
                >
                  {resetForm.formState.isSubmitting ? "Resetting Password..." : "Set New Password"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t p-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
