"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaymentDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  IndianRupee,
  Calendar,
  CheckCircle2,
  FileText,
  Smartphone,
  Banknote,
  Building,
  Info,
  ShieldCheck,
} from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getModeBadge(mode: string) {
  switch (mode?.toLowerCase()) {
    case "upi":
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 gap-1 text-xs">
          <Smartphone className="h-3 w-3" /> UPI
        </Badge>
      );
    case "cash":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-xs">
          <Banknote className="h-3 w-3" /> Cash
        </Badge>
      );
    case "cheque":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1 text-xs">
          <FileText className="h-3 w-3" /> Cheque
        </Badge>
      );
    case "bank_transfer":
      return (
        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 gap-1 text-xs">
          <Building className="h-3 w-3" /> Bank Transfer
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="capitalize text-xs">
          {mode || "Payment"}
        </Badge>
      );
  }
}

export default function PortalPaymentsPage() {
  const { data: payments, isLoading } = useQuery<PaymentDto[]>({
    queryKey: ["portal-payments"],
    queryFn: () => apiClient.get<PaymentDto[]>("/portal/payments"),
  });

  const totalPaidPaise = (payments || []).reduce((sum, p) => sum + p.amount_paise, 0);
  const totalCount = payments?.length || 0;
  const latestPayment = payments && payments.length > 0 ? payments[0] : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Payment Receipts</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Complete transaction ledger of rent, security deposits, and maintenance payments.
          </p>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Amount Paid
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {isLoading ? <Skeleton className="h-8 w-32" /> : formatRupees(totalPaidPaise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime total acknowledged</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Receipts
            </CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-12" /> : totalCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recorded transactions</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Latest Receipt
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : latestPayment ? (
                formatRupees(latestPayment.amount_paise)
              ) : (
                "—"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestPayment
                ? `Paid on ${new Date(latestPayment.payment_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : "No payments recorded yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Receipts Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Official payment vouchers and receipts issued by the hostel management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">No payments recorded yet</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Payments you make will be recorded by your hostel manager and will immediately generate a receipt here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px] border-b">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {p.record_number}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">{getModeBadge(p.mode)}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {p.reference || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                        {p.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatRupees(p.amount_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help info footer */}
      <div className="rounded-2xl border bg-muted/20 p-5 flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground text-sm">Need a printed physical copy?</p>
          <p>
            All electronic receipt vouchers recorded above are legally binding proof of payment. For stamped physical vouchers or tax receipts, present your receipt number to the hostel administrative desk.
          </p>
        </div>
      </div>
    </div>
  );
}

