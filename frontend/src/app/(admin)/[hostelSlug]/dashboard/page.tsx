"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { HostelDto, RoomDto, ManagerDto, PricingModelDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Bed, Users, CreditCard, Activity } from "lucide-react";
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
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Activity overview will be displayed here in future updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 flex justify-center items-center h-64 border-t">
             <p className="text-muted-foreground text-sm">No recent activity</p>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href={`/${hostelSlug}/admissions/new`}
                className={buttonVariants({ variant: "outline", className: "w-full justify-start text-left font-normal" })}
              >
                <Users className="mr-2 h-4 w-4" />
                Admit Hosteller
              </Link>
              <Link 
                href={`/${hostelSlug}/rooms`}
                className={buttonVariants({ variant: "outline", className: "w-full justify-start text-left font-normal" })}
              >
                <Bed className="mr-2 h-4 w-4" />
                Manage Rooms
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
