"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { HostellerDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Mail, Phone, Bed, Calendar, Users } from "lucide-react";

export default function RoomDetailPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const roomId = params.roomId as string;

  // Fetch occupants of this room
  const { data: response, isLoading } = useQuery({
    queryKey: ["hostellers", hostelSlug, { roomId }],
    queryFn: () =>
      apiClient.getList<HostellerDto>(`/hostellers?room_id=${roomId}`, {
        "x-hostel-slug": hostelSlug,
      }),
  });

  const occupants = response?.data || [];

  const statusVariant = (status: string) => {
    switch (status) {
      case "admitted": return "default";
      case "active": return "default";
      case "exit_pending": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center gap-4">
        <Link href={`/${hostelSlug}/rooms`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rooms
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Room Occupants</h1>
        <p className="text-muted-foreground mt-2">
          Currently admitted hostellers in this room.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : occupants.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 opacity-40 mb-4" />
            <p className="font-medium">This room is currently empty.</p>
            <p className="text-sm mt-1">Admit a hosteller to assign them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {occupants.map((hosteller) => (
            <Link
              key={hosteller.id}
              href={`/${hostelSlug}/hostellers/${hosteller.id}`}
            >
              <Card className="group cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {hosteller.name}
                        </CardTitle>
                        {hosteller.father_name && (
                          <CardDescription className="text-xs">
                            D/S of {hosteller.father_name}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusVariant(hosteller.status)} className="shrink-0">
                      {hosteller.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{hosteller.email}</span>
                  </div>
                  {hosteller.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{hosteller.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Admitted {new Date(hosteller.admission_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
