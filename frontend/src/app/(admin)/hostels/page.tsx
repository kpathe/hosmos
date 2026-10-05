"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { HostelDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Plus, Building } from "lucide-react";

export default function HostelsPage() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["hostels"],
    queryFn: () => apiClient.getList<HostelDto>("/hostels"),
  });

  const hostels = response?.data || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Hostels</h1>
          <p className="text-muted-foreground mt-2">
            Manage your hostel properties, or add a new one.
          </p>
        </div>
        <Link href="/hostels/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Hostel
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="mt-auto">
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hostels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center animate-in fade-in-50">
          <Building className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No hostels found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            You haven't added any hostels yet. Start by creating your first property to manage rooms, pricing, and staff.
          </p>
          <Link href="/hostels/new" className={buttonVariants({ variant: "secondary" })}>
            Add Your First Hostel
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hostels.map((hostel) => (
            <Card key={hostel.id} className="flex flex-col transition-all hover:shadow-md border-border/50 hover:border-primary/20">
              <CardHeader>
                <CardTitle>{hostel.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {hostel.address || "No address provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-6">
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                    <p className="font-medium">Active</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Created</p>
                    <p className="font-medium">{new Date(hostel.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Link href={`/${hostel.slug}/dashboard`} className={`${buttonVariants({ variant: "outline" })} w-full`}>
                  Manage Property
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
