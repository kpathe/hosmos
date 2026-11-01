"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { RegisterHostellerRequest, SendHostellerOtpResponse } from "@hosmos/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, KeyRound, ShieldCheck, ArrowRight, RotateCcw, CheckCircle2, Lock } from "lucide-react";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const requestOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyOtpSchema = z.object({
  otp: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d+$/, "Code must contain numbers only"),
  password_plain: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.password_plain === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type RequestOtpFormData = z.infer<typeof requestOtpSchema>;
type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [verifiedEmail, setVerifiedEmail] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Email form
  const emailForm = useForm<RequestOtpFormData>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: "" },
  });

  // Verify + Password form
  const verifyForm = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "", password_plain: "", confirm_password: "" },
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Request or resend OTP
  const handleSendOtp = async (targetEmail: string) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSendingOtp(true);

    try {
      const res = await fetch("/api/v1/proxy/auth/register/hosteller/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to send verification code");
      }

      const data: SendHostellerOtpResponse = json.data;
      setVerifiedEmail(targetEmail);
      setCooldown(data.cooldown_seconds || 60);
      setInfoMsg(data.message || `Verification code sent to ${targetEmail}`);
      setStep("otp");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onEmailSubmit = async (data: RequestOtpFormData) => {
    await handleSendOtp(data.email);
  };

  const onVerifySubmit = async (data: VerifyOtpFormData) => {
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const payload: RegisterHostellerRequest = {
        email: verifiedEmail,
        otp: data.otp,
        password_plain: data.password_plain,
      };

      const res = await fetch("/api/v1/proxy/auth/register/hosteller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || "Account activation failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?tab=hosteller");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Account activation failed");
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 md:p-24">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-card/90 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                Hosteller Activation
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {step === "email" ? "Activate Portal Access" : "Verify & Set Password"}
            </CardTitle>
            <CardDescription className="text-sm">
              {step === "email"
                ? "Enter the email you provided during admission to receive a verification code."
                : `Enter the 6-digit code sent to ${verifiedEmail} to complete setup.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {success ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center text-emerald-700 dark:text-emerald-400 space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce" />
                <h3 className="text-lg font-bold">Account Activated!</h3>
                <p className="text-sm text-muted-foreground">
                  Your credentials have been securely configured. Redirecting to resident login...
                </p>
              </div>
            ) : step === "email" ? (
              /* Step 1: Email Form */
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Admission Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@example.com"
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
                  disabled={isSendingOtp || emailForm.formState.isSubmitting}
                >
                  {isSendingOtp ? "Sending code..." : "Send Verification Code"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              /* Step 2: OTP & Password Form */
              <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
                <div className="flex items-center justify-between text-xs bg-muted/60 p-2.5 rounded-xl border">
                  <span className="text-muted-foreground truncate max-w-[220px]">
                    To: <strong className="text-foreground">{verifiedEmail}</strong>
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
                      disabled={cooldown > 0 || isSendingOtp}
                      onClick={() => handleSendOtp(verifiedEmail)}
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
                      {...verifyForm.register("otp")}
                    />
                  </div>
                  {verifyForm.formState.errors.otp && (
                    <p className="text-xs text-destructive">{verifyForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_plain" className="text-sm font-medium">
                    New Portal Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password_plain"
                      type="password"
                      placeholder="Minimum 8 characters"
                      className="pl-9"
                      {...verifyForm.register("password_plain")}
                    />
                  </div>
                  {verifyForm.formState.errors.password_plain && (
                    <p className="text-xs text-destructive">
                      {verifyForm.formState.errors.password_plain.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Repeat new password"
                      className="pl-9"
                      {...verifyForm.register("confirm_password")}
                    />
                  </div>
                  {verifyForm.formState.errors.confirm_password && (
                    <p className="text-xs text-destructive">
                      {verifyForm.formState.errors.confirm_password.message}
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
                  disabled={verifyForm.formState.isSubmitting}
                >
                  {verifyForm.formState.isSubmitting ? "Activating Account..." : "Verify & Activate Account"}
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              </form>
            )}
          </CardContent>

          {!success && (
            <CardFooter className="flex justify-center border-t p-4">
              <p className="text-sm text-muted-foreground">
                Already activated your account?{" "}
                <Link href="/login?tab=hosteller" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
