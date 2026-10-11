"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { HostelDto, RoomDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import {
  Building,
  Bed,
  Users,
  CreditCard,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Receipt,
  Sparkles,
} from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function HostelCardItem({ hostel }: { hostel: HostelDto }) {
  // Query rooms for this hostel to get room & occupancy count
  const { data: roomsRes, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms", hostel.slug],
    queryFn: () => apiClient.getList<RoomDto>("/rooms", { "x-hostel-slug": hostel.slug }),
  });

  const rooms = roomsRes?.data || [];
  const totalBeds = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.active_occupant_count, 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <Card className="flex flex-col border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 group overflow-hidden bg-card/60 backdrop-blur-sm">
      <div className="h-2 w-full bg-gradient-to-r from-primary/80 via-primary to-primary/40 group-hover:h-2.5 transition-all" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
              {hostel.name}
            </CardTitle>
            <CardDescription className="line-clamp-1 mt-1 text-xs">
              {hostel.address || "No address specified"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold shrink-0">
            Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 flex-1 flex flex-col justify-between pt-2">
        {/* Metric Badges */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-muted/40 rounded-xl border border-muted-foreground/10 text-center">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Rooms</p>
            <p className="text-base font-bold text-foreground mt-0.5">
              {isLoadingRooms ? "—" : rooms.length}
            </p>
          </div>
          <div className="border-x border-border/40">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Capacity</p>
            <p className="text-base font-bold text-foreground mt-0.5">
              {isLoadingRooms ? "—" : `${occupiedBeds}/${totalBeds}`}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Occupancy</p>
            <p className="text-base font-bold text-primary mt-0.5">
              {isLoadingRooms ? "—" : `${occupancyRate}%`}
            </p>
          </div>
        </div>

        {/* Property Attributes */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Electricity Rate:
            </span>
            <span className="font-medium text-foreground">
              {formatRupees(hostel.electricity_rate_paise)} / unit
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Security Deposit:
            </span>
            <span className="font-medium text-foreground">
              {formatRupees(hostel.security_deposit_amount_paise)}
            </span>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <Link
            href={`/${hostel.slug}/dashboard`}
            className={buttonVariants({ className: "w-full justify-between group/btn shadow-sm" })}
          >
            <span>Open Property Management</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href={`/${hostel.slug}/billing`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs" })}
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Bills
            </Link>
            <Link
              href={`/${hostel.slug}/hostellers`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs" })}
            >
              <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Residents
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GlobalDashboardPage() {
  const { user } = useAuth();

  const { data: hostelsRes, isLoading } = useQuery({
    queryKey: ["hostels"],
    queryFn: () => apiClient.getList<HostelDto>("/hostels"),
  });

  const hostels = hostelsRes?.data || [];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Portfolio Command Center
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Welcome back, {user?.name || "Owner"}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Track multi-hostel operations, resident occupancy, and quick access to all property controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/hostels/new" className={buttonVariants({ size: "lg", className: "shadow-md gap-2" })}>
              <Plus className="h-4 w-4" />
              Register New Hostel
            </Link>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Properties
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{isLoading ? "—" : hostels.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Hostels under management</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account Role
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold capitalize">{user?.role || "Owner"}</div>
            <p className="text-xs text-muted-foreground mt-1">Full administrative access</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Billing Cycles
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">Active</div>
            <p className="text-xs text-muted-foreground mt-1">Rent & Electricity automated</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System Status
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600">Healthy</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-tenant isolation active</p>
          </CardContent>
        </Card>
      </div>

      {/* Property Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Properties</h2>
            <p className="text-sm text-muted-foreground">
              Select a hostel to manage its rooms, residents, bills, and meter readings.
            </p>
          </div>
          {hostels.length > 0 && (
            <Link
              href="/hostels"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View in table <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : hostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 p-12 text-center bg-card/40">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Building className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">No hostels registered yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-md">
              Get started by adding your first hostel property to start managing rooms, residents, and automated billing.
            </p>
            <Link href="/hostels/new" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Hostel
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hostels.map((hostel) => (
              <HostelCardItem key={hostel.id} hostel={hostel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
