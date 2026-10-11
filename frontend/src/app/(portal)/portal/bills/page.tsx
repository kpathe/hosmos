"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { BillDto, BillItemDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building,
  Info,
  DollarSign,
} from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
          <CheckCircle2 className="h-3 w-3" /> Paid
        </Badge>
      );
    case "unpaid":
    case "pending":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
          <Clock className="h-3 w-3" /> Unpaid
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 font-medium">
          <Clock className="h-3 w-3" /> Partially Paid
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getItemTypeBadge(type: string) {
  switch (type.toLowerCase()) {
    case "rent":
      return <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">Rent</Badge>;
    case "electricity":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">Electricity</Badge>;
    case "late_fine":
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Late Fine</Badge>;
    default:
      return <Badge variant="outline" className="text-xs capitalize">{type.replace("_", " ")}</Badge>;
  }
}

export default function PortalBillsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [expandedBillIds, setExpandedBillIds] = useState<Record<string, boolean>>({});

  const { data: bills, isLoading } = useQuery<BillDto[]>({
    queryKey: ["portal-bills"],
    queryFn: () => apiClient.get<BillDto[]>("/portal/bills"),
  });

  const toggleExpand = (id: string) => {
    setExpandedBillIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredBills = (bills || []).filter((bill) => {
    if (filter === "pending") return bill.status !== "paid";
    if (filter === "paid") return bill.status === "paid";
    return true;
  });

  const totalOutstanding = (bills || [])
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + b.total_amount_paise, 0);

  const pendingCount = (bills || [])
    .filter((b) => b.status !== "paid").length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Invoices & Bills</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Detailed breakdown of your monthly room charges, electricity dues, and payment records.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl self-start md:self-auto border">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "ghost"}
            onClick={() => setFilter("all")}
            className="rounded-lg text-xs font-medium"
          >
            All Bills ({(bills || []).length})
          </Button>
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "ghost"}
            onClick={() => setFilter("pending")}
            className="rounded-lg text-xs font-medium"
          >
            Pending ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "paid" ? "default" : "ghost"}
            onClick={() => setFilter("paid")}
            className="rounded-lg text-xs font-medium"
          >
            Paid ({(bills || []).filter((b) => b.status === "paid").length})
          </Button>
        </div>
      </div>

      {/* Summary Highlights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Outstanding
            </CardTitle>
            <div className={`p-2 rounded-xl ${totalOutstanding > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              {totalOutstanding > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatRupees(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalOutstanding > 0 ? `${pendingCount} unpaid invoice(s)` : "All dues cleared"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Invoices Issued
            </CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-12" /> : (bills?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Historical itemized statements
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-card/50 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method
            </CardTitle>
            <div className="p-2 rounded-xl bg-muted text-muted-foreground">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-foreground">
              Direct Hostel Administration
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pay in cash or UPI at the reception office to receive instant receipt.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bill List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : filteredBills.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
              <Receipt className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">No bills found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
              {filter === "all"
                ? "No billing records have been generated for your account yet."
                : `There are currently no ${filter} bills to display.`}
            </p>
          </Card>
        ) : (
          filteredBills.map((bill) => {
            const isExpanded = !!expandedBillIds[bill.id];
            const monthName = MONTH_NAMES[bill.billing_period_month - 1] || `Month ${bill.billing_period_month}`;

            return (
              <Card
                key={bill.id}
                className={`transition-all duration-200 border-border/70 hover:border-primary/30 shadow-sm ${
                  isExpanded ? "ring-1 ring-primary/20" : ""
                }`}
              >
                <div
                  className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-lg text-foreground">
                          {monthName} {bill.billing_period_year}
                        </h3>
                        {getStatusBadge(bill.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Generated: {new Date(bill.generated_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {bill.paid_at && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Paid: {new Date(bill.paid_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span>• {bill.items?.length || 0} line item(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold tracking-tight text-foreground">
                        {formatRupees(bill.total_amount_paise)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-9 w-9 p-0 hover:bg-muted"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Collapsible Line Items Breakdown */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-5 sm:p-6 space-y-4 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Itemized Breakdown
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Invoice ID: <span className="font-mono">{bill.id.slice(0, 8)}...</span>
                      </span>
                    </div>

                    {bill.items && bill.items.length > 0 ? (
                      <div className="divide-y divide-border/60 rounded-xl border bg-card overflow-hidden">
                        {bill.items.map((item: BillItemDto) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3.5 sm:px-4 text-sm hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {getItemTypeBadge(item.item_type)}
                              <span className="font-medium text-foreground">
                                {item.description || item.item_type}
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {formatRupees(item.amount_paise)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between p-3.5 sm:px-4 bg-muted/40 font-bold text-sm">
                          <span>Total Invoiced</span>
                          <span className="text-base text-primary">
                            {formatRupees(bill.total_amount_paise)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No line items recorded for this bill.
                      </p>
                    )}

                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        To settle any pending charges or inquire about discrepancies, please contact your hostel warden or administrator. Payments reflect immediately once acknowledged.
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
