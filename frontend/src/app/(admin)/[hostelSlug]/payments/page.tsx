"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { PaymentDto, RecordPaymentRequest, HostellerDto, BillDto } from "@hosmos/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PaymentsPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  
  // Form state
  const [selectedHostellerId, setSelectedHostellerId] = useState<string>("");
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  const { data: paymentsResponse, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments", hostelSlug],
    queryFn: () => apiClient.getList<PaymentDto>("/payments", { "x-hostel-slug": hostelSlug }),
  });

  const { data: hostellersResponse } = useQuery({
    queryKey: ["hostellers", hostelSlug],
    queryFn: () => apiClient.getList<HostellerDto>("/hostellers", { "x-hostel-slug": hostelSlug }),
  });

  const { data: billsResponse } = useQuery({
    queryKey: ["bills", hostelSlug, "unpaid"],
    queryFn: () => apiClient.getList<BillDto>("/billing?status=unpaid", { "x-hostel-slug": hostelSlug }),
  });

  const payments = paymentsResponse?.data || [];
  const hostellers = hostellersResponse?.data || [];
  const unpaidBills = billsResponse?.data || [];

  // Filter bills based on selected hosteller
  const hostellerBills = useMemo(() => {
    if (!selectedHostellerId) return [];
    return unpaidBills.filter(b => b.hosteller_id === selectedHostellerId);
  }, [unpaidBills, selectedHostellerId]);

  const recordMutation = useMutation({
    mutationFn: (data: RecordPaymentRequest) =>
      apiClient.post("/payments", data, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payments", hostelSlug] });
      void queryClient.invalidateQueries({ queryKey: ["bills", hostelSlug] });
      toast({
        title: "Payment Recorded",
        description: "The payment has been successfully recorded.",
      });
      setIsRecordOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to record payment",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedHostellerId("");
    setSelectedBillId("");
    setAmount("");
    setMode("cash");
    setReference("");
    setDescription("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const handleRecord = () => {
    recordMutation.mutate({
      hosteller_id: selectedHostellerId,
      bill_id: selectedBillId,
      payment_date: paymentDate,
      amount_paise: Math.round(Number.parseFloat(amount) * 100),
      mode: mode as any,
      reference: reference || undefined,
      description: description || undefined,
    });
  };

  // Auto-fill amount when bill is selected
  const handleBillSelect = (billId: string) => {
    setSelectedBillId(billId);
    const bill = hostellerBills.find(b => b.id === billId);
    if (bill) {
      setAmount((bill.total_amount_paise / 100).toString());
    }
  };

  let billPlaceholder = "Select bill";
  if (!selectedHostellerId) {
    billPlaceholder = "Select a hosteller first";
  } else if (hostellerBills.length === 0) {
    billPlaceholder = "No unpaid bills";
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Record and track hosteller payments</p>
        </div>
        <Button onClick={() => setIsRecordOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record Payment
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Hosteller</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingPayments && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoadingPayments && payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No payments found.
                </TableCell>
              </TableRow>
            )}
            {!isLoadingPayments && payments.length > 0 && payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {payment.record_number}
                </TableCell>
                <TableCell>
                  {new Date(payment.payment_date).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell>
                  <Link href={`/${hostelSlug}/hostellers/${payment.hosteller_id}`} className="hover:underline font-medium">
                    {payment.hosteller_name || "Unknown"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">
                    {payment.mode}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {formatRupees(payment.amount_paise)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a new payment for an outstanding bill.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Hosteller</Label>
              <Select value={selectedHostellerId} onValueChange={(val) => {
                setSelectedHostellerId(val as string);
                setSelectedBillId("");
                setAmount("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hosteller" />
                </SelectTrigger>
                <SelectContent>
                  {hostellers.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outstanding Bill</Label>
              <Select 
                value={selectedBillId} 
                onValueChange={(val) => handleBillSelect(val as string)}
                disabled={!selectedHostellerId || hostellerBills.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={billPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {hostellerBills.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {MONTHS[b.billing_period_month]} {b.billing_period_year} ({formatRupees(b.total_amount_paise)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input 
                  type="date" 
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  disabled={!selectedBillId}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={mode} onValueChange={(val) => setMode(val as string)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number (Optional)</Label>
                <Input 
                  placeholder="Txn ID or Cheque No." 
                  value={reference} 
                  onChange={(e) => setReference(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input 
                placeholder="Any additional details..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRecord} 
              disabled={recordMutation.isPending || !selectedHostellerId || !selectedBillId || !amount || !paymentDate}
            >
              {recordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
