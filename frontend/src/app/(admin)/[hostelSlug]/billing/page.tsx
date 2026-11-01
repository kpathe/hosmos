"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { BillDto, GenerateBillsRequest, GenerateBillsResponse } from "@hosmos/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, Loader2, Plus } from "lucide-react";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BillingPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [filterMonth, setFilterMonth] = useState(currentMonth.toString());
  const [filterStatus, setFilterStatus] = useState("all");

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genYear, setGenYear] = useState(currentYear.toString());
  const [genMonth, setGenMonth] = useState(currentMonth.toString());

  const { data: response, isLoading } = useQuery({
    queryKey: ["bills", hostelSlug, filterYear, filterMonth, filterStatus],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      if (filterYear !== "all") queryParams.append("year", filterYear);
      if (filterMonth !== "all") queryParams.append("month", filterMonth);
      if (filterStatus !== "all") queryParams.append("status", filterStatus);

      return apiClient.getList<BillDto>(`/billing?${queryParams.toString()}`, {
        "x-hostel-slug": hostelSlug,
      });
    }
  });

  const bills = response?.data || [];

  const generateMutation = useMutation({
    mutationFn: (data: GenerateBillsRequest) =>
      apiClient.post<GenerateBillsRequest, GenerateBillsResponse>(
        "/billing/generate",
        data,
        { "x-hostel-slug": hostelSlug }
      ),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["bills", hostelSlug] });
      toast({
        title: "Bills Generated",
        description: `Successfully created ${data.billsCreated} new bills. Skipped ${data.billsSkipped} existing/invalid bills.`,
      });
      setIsGenerateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      year: Number.parseInt(genYear, 10),
      month: Number.parseInt(genMonth, 10),
    });
  };

  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage monthly rent and electricity bills</p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsGenerateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Generate Bills
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg border">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Select value={filterYear} onValueChange={(val) => setFilterYear(val as string)}>
            <SelectTrigger className="w-30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select value={filterMonth} onValueChange={(val) => setFilterMonth(val as string)}>
            <SelectTrigger className="w-30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>{MONTHS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as string)}>
            <SelectTrigger className="w-30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hosteller</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && bills.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No bills found.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && bills.length > 0 && bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">
                  <Link href={`/${hostelSlug}/hostellers/${bill.hosteller_id}`} className="hover:underline">
                    {bill.hosteller_name || "Unknown"}
                  </Link>
                </TableCell>
                <TableCell>
                  {MONTHS[bill.billing_period_month]} {bill.billing_period_year}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatRupees(bill.total_amount_paise)}
                </TableCell>
                <TableCell>
                  <Badge variant={bill.status === "paid" ? "secondary" : "default"} className={
                    bill.status === "paid" 
                      ? "bg-green-100 text-green-700 hover:bg-green-100" 
                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                  }>
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/${hostelSlug}/billing/${bill.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Generate Bills Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Monthly Bills</DialogTitle>
            <DialogDescription>
              Create rent bills for all active hostellers for current or past periods. Generating bills for future months is not allowed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select 
                value={genYear} 
                onValueChange={(val) => {
                  const y = val as string;
                  setGenYear(y);
                  if (Number(y) === currentYear && Number(genMonth) > currentMonth) {
                    setGenMonth(currentMonth.toString());
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={genMonth} onValueChange={(val) => setGenMonth(val as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .filter(m => Number(genYear) < currentYear || m <= currentMonth)
                    .map(m => (
                      <SelectItem key={m} value={m.toString()}>{MONTHS[m]}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Bills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
