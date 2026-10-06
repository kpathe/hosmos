"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import type { PricingModelDto, CreatePricingModelRequest } from "@hosmos/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Loader2, Edit, Trash2 } from "lucide-react";

const pricingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  charging_basis: z.enum(["PER_SEAT", "FULL_ROOM"]),
  monthly_amount_rupees: z.coerce.number().min(0, "Amount must be positive"),
  compatible_capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
});

export default function PricingModelsPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<PricingModelDto | null>(null);
  const [pricingToDelete, setPricingToDelete] = useState<PricingModelDto | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editPriceRupees, setEditPriceRupees] = useState<number>(0);

  const { data: response, isLoading } = useQuery({
    queryKey: ["pricing", hostelSlug],
    queryFn: () => apiClient.getList<PricingModelDto>("/pricing", { "x-hostel-slug": hostelSlug }),
  });

  const pricingModels = response?.data || [];

  const form = useForm<z.infer<typeof pricingSchema>>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      name: "",
      charging_basis: "PER_SEAT",
      monthly_amount_rupees: 5000, // 5000 INR
      compatible_capacity: 2,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, monthly_amount_paise: number }) => 
      apiClient.put(`/pricing/${data.id}`, { monthly_amount_paise: data.monthly_amount_paise }, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", hostelSlug] });
      toast({ title: "Success", description: "Pricing updated successfully." });
      setEditingPricing(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update pricing.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricing/${id}`, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", hostelSlug] });
      toast({ title: "Success", description: "Pricing model deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete pricing model.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post<CreatePricingModelRequest, PricingModelDto>("/pricing", {
      ...data,
      monthly_amount_paise: Math.round(data.monthly_amount_rupees * 100)
    }, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", hostelSlug] });
      toast({ title: "Success", description: "Pricing model created successfully." });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create pricing model.", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof pricingSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pricing Models</h1>
          <p className="text-muted-foreground mt-2">Configure pricing plans for your rooms.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Add Model
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Pricing Model</DialogTitle>
              <DialogDescription>Create a new pricing tier for your hostel.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input id="name" placeholder="e.g. Standard 2-Seater AC" {...form.register("name")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_amount_rupees">Monthly Rent (₹)</Label>
                  <Input id="monthly_amount_rupees" type="number" {...form.register("monthly_amount_rupees")} />
                  <p className="text-xs text-muted-foreground">Amount in INR</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charging_basis">Basis</Label>
                  <Select onValueChange={(val: any) => form.setValue("charging_basis", val)} defaultValue={form.getValues("charging_basis")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select basis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_SEAT">Per Seat</SelectItem>
                      <SelectItem value="FULL_ROOM">Full Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compatible_capacity">Room Capacity Target</Label>
                <Input id="compatible_capacity" type="number" {...form.register("compatible_capacity")} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Model
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Models</CardTitle>
          <CardDescription>Manage active pricing plans.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : pricingModels.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No pricing models found. Create one to assign to your rooms.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rent (Monthly)</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead>Target Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingModels.map((pm) => (
                    <TableRow key={pm.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {pm.name}
                      </TableCell>
                      <TableCell>₹{(pm.monthly_amount_paise / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pm.charging_basis.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{pm.compatible_capacity} Beds</TableCell>
                      <TableCell>
                        <Badge variant={pm.is_active ? "default" : "secondary"}>
                          {pm.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingPricing(pm);
                            setEditPriceRupees(pm.monthly_amount_paise / 100);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setPricingToDelete(pm);
                            setDeleteConfirmText("");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Edit Pricing Dialog */}
        <Dialog open={!!editingPricing} onOpenChange={(open) => !open && setEditingPricing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pricing: {editingPricing?.name}</DialogTitle>
              <DialogDescription>
                Only the price can be edited for an existing pricing model.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Monthly Rent (₹)</Label>
                <Input 
                  type="number"
                  value={editPriceRupees}
                  onChange={(e) => setEditPriceRupees(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPricing(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (editingPricing) {
                    updateMutation.mutate({ 
                      id: editingPricing.id, 
                      monthly_amount_paise: Math.round(editPriceRupees * 100)
                    });
                  }
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Pricing Dialog */}
        <Dialog open={!!pricingToDelete} onOpenChange={(open) => !open && setPricingToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Pricing Model</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {pricingToDelete?.name}?
                To confirm, please type <strong>DELETE</strong> below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input 
                value={deleteConfirmText} 
                onChange={(e) => setDeleteConfirmText(e.target.value)} 
                placeholder="Type DELETE to confirm" 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPricingToDelete(null)}>Cancel</Button>
              <Button 
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
                onClick={() => {
                  if (pricingToDelete) {
                    deleteMutation.mutate(pricingToDelete.id, {
                      onSuccess: () => setPricingToDelete(null)
                    });
                  }
                }}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
