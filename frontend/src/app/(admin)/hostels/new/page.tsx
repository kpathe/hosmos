"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import { CreateHostelRequest, HostelDto } from "@hosmos/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const createHostelSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  address: z.string().max(255, "Address must be less than 255 characters").optional(),
  electricity_rate_rupees: z.coerce.number().min(0, "Rate must be positive"),
  security_deposit_amount_rupees: z.coerce.number().min(0, "Deposit must be positive"),
  late_fine_amount_rupees: z.coerce.number().min(0, "Fine must be positive"),
});

export default function CreateHostelPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof createHostelSchema>>({
    resolver: zodResolver(createHostelSchema),
    defaultValues: {
      name: "",
      address: "",
      electricity_rate_rupees: 0,
      security_deposit_amount_rupees: 0,
      late_fine_amount_rupees: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.post<CreateHostelRequest, HostelDto>("/hostels", {
      ...data,
      electricity_rate_paise: Math.round(data.electricity_rate_rupees * 100),
      security_deposit_amount_paise: Math.round(data.security_deposit_amount_rupees * 100),
      late_fine_amount_paise: Math.round(data.late_fine_amount_rupees * 100),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hostels"] });
      toast({
        title: "Success",
        description: "Hostel created successfully.",
      });
      router.push(`/hostels`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create hostel.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof createHostelSchema>) => {
    // Convert to the exact types needed by the backend
    mutation.mutate({
      ...values,
      address: values.address || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link href="/hostels" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Hostel</h1>
          <p className="text-muted-foreground mt-2">
            Create a new hostel property to manage.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>Enter the basic information for your new hostel.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Hostel Name</Label>
                <Input id="name" placeholder="E.g., Sunrise Backpackers" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input id="address" placeholder="Full physical address" {...form.register("address")} />
                {form.formState.errors.address && (
                  <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                <div className="space-y-2">
                  <Label htmlFor="electricity_rate_rupees">Electricity Rate (₹/Unit)</Label>
                  <Input id="electricity_rate_rupees" type="number" {...form.register("electricity_rate_rupees")} />
                  {form.formState.errors.electricity_rate_rupees && (
                    <p className="text-sm text-destructive">{form.formState.errors.electricity_rate_rupees.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit_amount_rupees">Security Deposit (₹)</Label>
                  <Input id="security_deposit_amount_rupees" type="number" {...form.register("security_deposit_amount_rupees")} />
                  {form.formState.errors.security_deposit_amount_rupees && (
                    <p className="text-sm text-destructive">{form.formState.errors.security_deposit_amount_rupees.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="late_fine_amount_rupees">Late Fine/Month (₹)</Label>
                  <Input id="late_fine_amount_rupees" type="number" {...form.register("late_fine_amount_rupees")} />
                  {form.formState.errors.late_fine_amount_rupees && (
                    <p className="text-sm text-destructive">{form.formState.errors.late_fine_amount_rupees.message}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Link href="/hostels" className={`${buttonVariants({ variant: "outline" })} mr-4`}>
                  Cancel
                </Link>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Hostel
                </Button>
              </div>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
