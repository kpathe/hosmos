"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, IndianRupee, ShieldCheck, ShieldAlert } from "lucide-react";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function LedgerPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;

  const [year, setYear] = useState(currentYear.toString());
  const [month, setMonth] = useState(currentMonth.toString());

  const { data: response, isLoading } = useQuery({
    queryKey: ["ledger", hostelSlug, year, month],
    queryFn: () => apiClient.get<any>(`/reports/ledger?year=${year}&month=${month}`, {
      "x-hostel-slug": hostelSlug,
    }),
  });

  const ledger = response?.data ?? response;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Statement</h1>
        <p className="text-muted-foreground mt-1">Monthly financial ledger and net income</p>
      </div>

      <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg border max-w-md">
        <div className="space-y-1 flex-1">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Select value={year} onValueChange={(val) => setYear(val as string)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select value={month} onValueChange={(val) => setMonth(val as string)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>{MONTHS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : ledger ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Payments Received
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatRupees(ledger.total_payments_received_paise)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Rent, electricity, fines, etc.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Deposits Collected
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatRupees(ledger.security_deposits_collected_paise)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                New admissions liability
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Deposits Refunded
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatRupees(ledger.security_deposits_refunded_paise)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Returned during exits
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Net Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatRupees(ledger.net_income_paise)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Payments + Collected - Refunded
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center p-12 text-muted-foreground border rounded-lg bg-card">
          Failed to load ledger data.
        </div>
      )}
    </div>
  );
}
