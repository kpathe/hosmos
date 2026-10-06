"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { BillDto, AddBillItemRequest, UpdateBillItemRequest } from "@hosmos/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus, Edit2, Info } from "lucide-react";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BillDetailPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const billId = params.billId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: response, isLoading } = useQuery({
    queryKey: ["bill", hostelSlug, billId],
    queryFn: () => apiClient.get<BillDto>(`/billing/${billId}`, { "x-hostel-slug": hostelSlug }),
  });

  const bill = response;

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemType, setAddItemType] = useState("other");
  const [addDescription, setAddDescription] = useState("");
  const [addAmount, setAddAmount] = useState("");

  const [isUpdateItemOpen, setIsUpdateItemOpen] = useState(false);
  const [updateItemId, setUpdateItemId] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [updateAmount, setUpdateAmount] = useState("");

  const addItemMutation = useMutation({
    mutationFn: (data: AddBillItemRequest) =>
      apiClient.post(`/billing/${billId}/items`, data, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill", hostelSlug, billId] });
      toast({ title: "Item Added", description: "The bill item was successfully added." });
      setIsAddItemOpen(false);
      setAddDescription("");
      setAddAmount("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to add item", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateBillItemRequest }) =>
      apiClient.patch(`/billing/${billId}/items/${itemId}`, data, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill", hostelSlug, billId] });
      toast({ title: "Item Updated", description: "The bill item was successfully updated." });
      setIsUpdateItemOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update item", description: error.message, variant: "destructive" });
    },
  });

  const handleAddItem = () => {
    addItemMutation.mutate({
      item_type: addItemType as any,
      description: addDescription,
      amount_paise: Math.round(parseFloat(addAmount) * 100),
    });
  };

  const openUpdateItem = (item: any) => {
    setUpdateItemId(item.id);
    setUpdateDescription(item.description);
    setUpdateAmount((item.amount_paise / 100).toString());
    setIsUpdateItemOpen(true);
  };

  const handleUpdateItem = () => {
    updateItemMutation.mutate({
      itemId: updateItemId,
      data: {
        description: updateDescription,
        amount_paise: Math.round(parseFloat(updateAmount) * 100),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p>Bill not found.</p>
      </div>
    );
  }

  const isPaid = bill.status === "paid";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center gap-4">
        <Link href={`/${hostelSlug}/billing`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Billing
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bill Details
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            {MONTHS[bill.billing_period_month]} {bill.billing_period_year} · 
            <Link href={`/${hostelSlug}/hostellers/${bill.hosteller_id}`} className="hover:underline text-primary">
              {bill.hosteller_name || "Hosteller"}
            </Link>
          </p>
        </div>
        <Badge variant={isPaid ? "secondary" : "default"} className={`text-sm px-3 py-1 ${
          isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}>
          {bill.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bill Items</CardTitle>
              <CardDescription>Breakdown of charges and credits</CardDescription>
            </div>
            {!isPaid && (
              <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bill.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.item_type.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${item.amount_paise < 0 ? "text-green-600" : ""}`}>
                      {item.amount_paise < 0 ? "-" : ""}{formatRupees(Math.abs(item.amount_paise))}
                    </span>
                    {!isPaid && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUpdateItem(item)}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {bill.items.length === 0 && (
                <p className="text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                  No items on this bill.
                </p>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t flex items-center justify-between">
              <span className="text-lg font-medium">Total Amount</span>
              <span className="text-3xl font-bold">{formatRupees(bill.total_amount_paise)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Generated On</p>
              <p className="font-medium">{new Date(bill.generated_at).toLocaleDateString("en-IN")}</p>
            </div>
            {isPaid && bill.paid_at && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Paid On</p>
                <p className="font-medium">{new Date(bill.paid_at).toLocaleDateString("en-IN")}</p>
              </div>
            )}
            
            {!isPaid && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 text-blue-800 flex items-start gap-3 mt-6">
                <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Payment Recording</p>
                  <p className="text-blue-700/90 leading-relaxed">
                    To record a payment for this bill, please use the Payments module (Phase 6).
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bill Item</DialogTitle>
            <DialogDescription>
              Add a new charge or credit to this unpaid bill. Use a negative amount for credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select value={addItemType} onValueChange={(val) => setAddItemType(val as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="late_fine">Late Fine</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="e.g., Late payment fine for October" 
                value={addDescription} 
                onChange={(e) => setAddDescription(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="e.g., 500" 
                value={addAmount} 
                onChange={(e) => setAddAmount(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={addItemMutation.isPending || !addDescription || !addAmount}>
              {addItemMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Item Dialog */}
      <Dialog open={isUpdateItemOpen} onOpenChange={setIsUpdateItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Bill Item</DialogTitle>
            <DialogDescription>
              Modify the description or amount. Use a negative amount for credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={updateDescription} 
                onChange={(e) => setUpdateDescription(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={updateAmount} 
                onChange={(e) => setUpdateAmount(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateItemOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateItem} disabled={updateItemMutation.isPending || !updateDescription || !updateAmount}>
              {updateItemMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
