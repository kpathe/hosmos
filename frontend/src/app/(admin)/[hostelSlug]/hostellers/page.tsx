"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { HostellerDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Phone, Calendar } from "lucide-react";

export default function HostellersPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const router = useRouter();

  const { data: response, isLoading } = useQuery({
    queryKey: ["hostellers", hostelSlug],
    queryFn: () => apiClient.getList<HostellerDto>("/hostellers", { "x-hostel-slug": hostelSlug }),
  });

  const hostellers = response?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hostellers</h1>
        <p className="text-muted-foreground mt-2">
          All admitted hostellers in this property — click any name to view their full profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admitted Hostellers</CardTitle>
          <CardDescription>Sorted alphabetically · {hostellers.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : hostellers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No hostellers found. Admit a hosteller to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admission Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hostellers.map((hosteller) => (
                    <TableRow
                      key={hosteller.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${hostelSlug}/hostellers/${hosteller.username || hosteller.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="hover:text-primary transition-colors">
                          <div className="font-semibold">{hosteller.name}</div>
                          {hosteller.father_name && (
                            <div className="text-xs text-muted-foreground">D/S of {hosteller.father_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {hosteller.email}
                          </span>
                          {hosteller.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {hosteller.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            hosteller.status === "admitted" || hosteller.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {hosteller.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(hosteller.admission_date).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
