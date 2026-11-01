"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { HostelDto, RoomDto, ManagerDto, PricingModelDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Bed, Users, CreditCard, Activity, Zap, ShieldCheck, Receipt, Gauge } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function HostelDashboardPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;

  // Fetch hostel details
  const { data: hostelResponse, isLoading: isLoadingHostel } = useQuery({
    queryKey: ["hostels", hostelSlug],
    queryFn: () => apiClient.get<HostelDto>(`/hostels/${hostelSlug}`),
  });

  // Fetch rooms for stats
  const { data: roomsResponse, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms", hostelSlug],
    queryFn: () => apiClient.getList<RoomDto>(`/rooms`, { "x-hostel-slug": hostelSlug }),
  });

  const { data: managersResponse, isLoading: isLoadingManagers } = useQuery({
    queryKey: ["managers", hostelSlug],
    queryFn: () => apiClient.getList<ManagerDto>(`/managers`, { "x-hostel-slug": hostelSlug }),
  });

  const { data: pricingResponse, isLoading: isLoadingPricing } = useQuery({
    queryKey: ["pricing", hostelSlug],
    queryFn: () => apiClient.getList<PricingModelDto>(`/pricing`, { "x-hostel-slug": hostelSlug }),
  });

  const hostel = hostelResponse;
  const isLoading = isLoadingHostel;

  const totalCapacity = roomsResponse?.data.reduce((acc, room) => acc + room.capacity, 0) || 0;
  const totalOccupied = roomsResponse?.data.reduce((acc, room) => acc + room.active_occupant_count, 0) || 0;
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  if (!hostel) {
    return <div>Hostel not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{hostel.name} Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {hostel.address || "Overview of your property."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingRooms ? "--" : roomsResponse?.data.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active rooms in property
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingRooms ? "--" : occupancyRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently occupied beds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pricing Models</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingPricing ? "--" : pricingResponse?.data.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Configured plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingManagers ? "--" : managersResponse?.data.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active managers
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Property Configuration</CardTitle>
            <CardDescription>
              Billing and operational parameters configured for {hostel.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" /> Electricity Rate
                </span>
                <p className="text-xl font-bold text-foreground">
                  ₹{(hostel.electricity_rate_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ unit</span>
                </p>
                <p className="text-[11px] text-muted-foreground">Meter readings split across room occupants</p>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Security Deposit
                </span>
                <p className="text-xl font-bold text-foreground">
                  ₹{(hostel.security_deposit_amount_paise / 100).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">Standard refundable admission deposit</p>
              </div>
            </div>

            <div className="rounded-xl border p-4 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Total Bed Capacity Utilization</span>
                <span className="text-foreground font-bold">{totalOccupied} / {totalCapacity} Beds ({occupancyRate}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, occupancyRate)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href={`/${hostelSlug}/admissions/new`}
                className={buttonVariants({ variant: "outline", className: "w-full justify-start text-left font-normal text-xs" })}
              >
                <Users className="mr-2 h-4 w-4" />
                Admit Hosteller
              </Link>
              <Link 
                href={`/${hostelSlug}/rooms`}
                className={buttonVariants({ variant: "outline", className: "w-full justify-start text-left font-normal text-xs" })}
              >
                <Bed className="mr-2 h-4 w-4" />
                Manage Rooms
              </Link>
              <Link 
                href={`/${hostelSlug}/billing`}
                className={buttonVariants({ variant: "outline", className: "w-full justify-start text-left font-normal text-xs" })}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Generate Bills
              </Link>
              <Link 
                href={`/${hostelSlug}/meters`}
                className={buttonVariants({ variant: "outline", className: "w-full justify-start text-left font-normal text-xs" })}
              >
                <Gauge className="mr-2 h-4 w-4" />
                Sub-Meters
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
