"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PortalRoomDto, MeterReadingDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble,
  Users,
  Zap,
  Layers,
  Calendar,
  Phone,
  Info,
  ShieldCheck,
  Building,
  Activity,
  AlertCircle,
  IndianRupee,
} from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PortalRoomPage() {
  const { data: roomData, isLoading, error } = useQuery<PortalRoomDto>({
    queryKey: ["portal-room"],
    queryFn: () => apiClient.get<PortalRoomDto>("/portal/room"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
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

  if (error || !roomData || !roomData.room) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Card className="border-dashed p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
            <BedDouble className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">No Room Currently Assigned</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
            You do not currently have an active room allocation in this hostel. Please contact your hostel warden or administrator to assign a room.
          </p>
        </Card>
      </div>
    );
  }

  const { room, pricing_model, roommates, meter_readings } = roomData;
  const occupancyPercentage = Math.round((roommates.length / (room.capacity || 1)) * 100);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Room {room.room_number}</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              Floor {room.floor}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Your living space allocation, assigned roommates, and utility meter readings.
          </p>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Room Number
            </CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BedDouble className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{room.room_number}</div>
            <p className="text-xs text-muted-foreground mt-1">Floor {room.floor}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Occupancy
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {roommates.length} / {room.capacity}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupancyPercentage}% capacity utilized
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Base Rate
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {pricing_model ? formatRupees(pricing_model.monthly_amount_paise) : "Standard"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pricing_model ? pricing_model.name : "Default hostel tier"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sub-Meter
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {meter_readings && meter_readings.length > 0
                ? `${meter_readings[0].reading_value} kWh`
                : "Active"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {meter_readings && meter_readings.length > 0
                ? `Last read ${new Date(meter_readings[0].reading_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                : "Divided among occupants"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Roommates & Utility Readings */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roommates Column (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Roommates ({roommates.length})
              </CardTitle>
              <CardDescription>
                Fellow residents sharing Room {room.room_number}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roommates.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  No other roommates currently assigned.
                </p>
              ) : (
                roommates.map((mate) => (
                  <div
                    key={mate.id}
                    className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-1.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{mate.name}</span>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        Occupant
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Admitted: {new Date(mate.admission_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {mate.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          <span>{mate.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Guidelines Notice Card */}
          <Card className="border-border/70 bg-muted/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <Info className="h-4 w-4" />
                <span>Room Policies</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Electricity sub-meter readings are taken at the end of each billing cycle. Total consumption units are split equally among all active residents of the room for that cycle.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Meter Readings Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Sub-Meter Readings History
                </CardTitle>
                <CardDescription>
                  Periodic meter logs recorded for electricity calculation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {meter_readings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No meter readings recorded yet</p>
                  <p className="text-xs mt-1">Readings recorded by management will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px] border-b">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Reading (kWh)</th>
                        <th className="py-3 px-4">Cycle Type</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {meter_readings.map((reading: MeterReadingDto) => (
                        <tr key={reading.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">
                            {new Date(reading.reading_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-foreground text-sm">
                            {reading.reading_value.toFixed(1)}
                          </td>
                          <td className="py-3 px-4">
                            {reading.is_reset ? (
                              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 text-[10px]">
                                Meter Reset
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-500/5 text-[10px]">
                                Regular Cycle
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                            {reading.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
