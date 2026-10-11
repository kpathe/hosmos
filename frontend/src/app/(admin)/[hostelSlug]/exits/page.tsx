"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserMinus, ShieldCheck, Calendar, FileText } from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ExitsPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const router = useRouter();

  const { data: response, isLoading } = useQuery({
    queryKey: ["exits", hostelSlug],
    queryFn: () => apiClient.get<any[]>("/exits", { "x-hostel-slug": hostelSlug }),
  });

  const exits = response ?? [];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hosteller Exits & Settlements</h1>
        <p className="text-muted-foreground mt-2">
          History of all vacated residents, damage deductions, and returned security deposits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settled Exits</CardTitle>
              <CardDescription>
                {exits.length} resident(s) exited and settled
              </CardDescription>
            </div>
            <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : exits.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserMinus className="mx-auto h-12 w-12 opacity-50 mb-3" />
              <p className="text-base font-medium">No exited hostellers</p>
              <p className="text-xs mt-1">When a resident moves out, their exit settlement will appear here.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Hosteller</TableHead>
                    <TableHead>Exit Date</TableHead>
                    <TableHead>Original Deposit</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Amount Refunded</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exits.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${hostelSlug}/hostellers/${item.hosteller_id}`)}
                    >
                      <TableCell className="font-semibold text-foreground">
                        <div>{item.hosteller_name}</div>
                        <div className="text-xs text-muted-foreground font-normal">{item.hosteller_email}</div>
                      </TableCell>
                      <TableCell>
                        {item.settlement_date ? new Date(item.settlement_date).toLocaleDateString("en-IN") : "—"}
                      </TableCell>
                      <TableCell>
                        {formatRupees(item.original_amount_paise)}
                      </TableCell>
                      <TableCell className={item.deductions_paise > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {item.deductions_paise > 0 ? `-${formatRupees(item.deductions_paise)}` : "₹0.00"}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        {formatRupees(item.refunded_amount_paise ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {item.settlement_notes || "—"}
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
