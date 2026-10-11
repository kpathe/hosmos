"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { PortalProfileDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BedDouble,
  Receipt,
  IndianRupee,
  ShieldCheck,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CreditCard,
} from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PortalDashboardPage() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["portal-profile"],
    queryFn: () => apiClient.get<PortalProfileDto>("/portal/me"),
  });

  const profile = response;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Unable to load your resident profile. Please try logging in again.
      </div>
    );
  }

  const { hosteller, hostel, current_room, security_deposit, total_outstanding_paise, last_payment } = profile;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Resident Portal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Hello, {hosteller.name.split(" ")[0]}!
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Welcome to your resident dashboard at <span className="font-semibold text-foreground">{hostel.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal/bills"
              className={buttonVariants({ size: "default", className: "gap-2" })}
            >
              <Receipt className="h-4 w-4" />
              View Bills
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Room Info */}
        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Current Room
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BedDouble className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {current_room ? `Room ${current_room.room_number}` : "Not Assigned"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {current_room ? `${current_room.floor} Floor · ${current_room.capacity}-sharing` : "Contact manager"}
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Balance */}
        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Dues
            </CardTitle>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                total_outstanding_paise > 0
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight ${
                total_outstanding_paise > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {formatRupees(total_outstanding_paise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.active_bill_count > 0
                ? `${profile.active_bill_count} unpaid bill(s)`
                : "All dues cleared"}
            </p>
          </CardContent>
        </Card>

        {/* Security Deposit */}
        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Security Deposit
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {security_deposit ? formatRupees(security_deposit.original_amount_paise) : "₹0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize font-normal">
                {security_deposit?.status || "none"}
              </Badge>
              refundable upon exit
            </p>
          </CardContent>
        </Card>

        {/* Last Payment */}
        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Last Payment
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {last_payment ? formatRupees(last_payment.amount_paise) : "None"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {last_payment
                ? new Date(last_payment.payment_date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No payments yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lower Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Resident & Hostel Profile */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Profile Information
            </CardTitle>
            <CardDescription>Your registered resident details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium text-foreground">{hosteller.name}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{hosteller.email}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Phone Number</span>
              <span className="font-medium text-foreground">{hosteller.phone || "Not provided"}</span>
            </div>
            {hosteller.college && (
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">College / University</span>
                <span className="font-medium text-foreground">{hosteller.college}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Admission Date</span>
              <span className="font-medium text-foreground">
                {new Date(hosteller.admission_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Account Status</span>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {hosteller.status.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Property & Quick Links */}
        <Card className="border-border/60 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" /> Property Contact & Facilities
            </CardTitle>
            <CardDescription>{hostel.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl bg-muted/40 p-4 space-y-2 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
              <p className="text-sm font-medium">{hostel.address || "Address details on file with office"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/portal/room"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">My Room & Roommates</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/portal/payments"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Payment History</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
