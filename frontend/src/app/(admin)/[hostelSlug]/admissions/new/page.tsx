"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { RoomDto, CreateAdmissionRequest, AdmissionResultDto } from "@hosmos/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const admissionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  father_name: z.string().min(2, "Father's name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  college: z.string().optional(),
  branch: z.string().optional(),
  address: z.string().optional(),
  aadhaar_number: z.string().optional(),
  admission_date: z.string(),
  room_id: z.string().min(1, "Room assignment is required"),
  security_deposit_amount_rupees: z.coerce.number().min(0, "Amount cannot be negative"),
  advance_months: z.coerce.number().min(0, "Must be at least 0").max(12, "Cannot exceed 12 months"),
  payment_mode: z.enum(["cash", "cheque", "upi"]),
  payment_date: z.string(),
  payment_reference: z.string().optional(),
  payment_description: z.string().optional(),
});

export default function NewAdmissionPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [successResult, setSuccessResult] = useState<AdmissionResultDto | null>(null);

  // Fetch rooms for room selection
  const { data: roomsResponse, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms", hostelSlug],
    queryFn: () => apiClient.getList<RoomDto>("/rooms", { "x-hostel-slug": hostelSlug }),
  });

  const rooms = roomsResponse?.data || [];
  
  // Filter for available rooms (must have pricing model and capacity)
  const availableRooms = rooms.filter(room => {
    if (!room.pricing_model_id || !room.pricing_model) return false;
    if (room.pricing_model.charging_basis === "FULL_ROOM") {
      return room.active_occupant_count === 0;
    }
    return room.active_occupant_count < room.capacity;
  });

  const form = useForm<z.infer<typeof admissionSchema>>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      name: "",
      father_name: "",
      email: "",
      phone: "",
      college: "",
      branch: "",
      address: "",
      aadhaar_number: "",
      admission_date: new Date().toISOString().split('T')[0],
      room_id: "",
      security_deposit_amount_rupees: 5000, // Default 5000 INR
      advance_months: 3, // Default 3 months
      payment_mode: "upi",
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: "",
      payment_description: "Initial Admission Payment",
    },
  });

  const selectedRoom = availableRooms.find(r => r.id === form.watch("room_id"));

  const admissionMutation = useMutation({
    mutationFn: (data: any) => apiClient.post<CreateAdmissionRequest, AdmissionResultDto>("/admissions", {
      ...data,
      security_deposit_amount_paise: Math.round(data.security_deposit_amount_rupees * 100)
    }, { "x-hostel-slug": hostelSlug }),
    onSuccess: (res) => {
      toast({ title: "Admission Successful", description: "Hosteller has been admitted and billed." });
      setSuccessResult(res);
    },
    onError: (error: any) => {
      toast({ title: "Admission Failed", description: error.message || "An error occurred during admission.", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof admissionSchema>) => {
    admissionMutation.mutate(values);
  };

  if (successResult) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-500 max-w-2xl mx-auto mt-10">
        <Card className="border-green-500/20">
          <CardHeader className="text-center pb-2">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Admission Successful!</CardTitle>
            <CardDescription>
              {successResult.hosteller.name} has been admitted to Room {successResult.room.room_number}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-muted-foreground">Hosteller ID</p>
                <p className="font-medium">{successResult.hosteller.id.split("-")[0]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Initial Bill Total</p>
                <p className="font-medium">₹{(successResult.admission_bill.total_amount_paise / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Recorded</p>
                <p className="font-medium">₹{(successResult.payment.amount_paise / 100).toFixed(2)} ({successResult.payment.mode})</p>
              </div>
              <div>
                <p className="text-muted-foreground">Advance Allocations</p>
                <p className="font-medium">{successResult.advance_allocations.length} months</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center space-x-4">
            <Button variant="outline" onClick={() => {
              setSuccessResult(null);
              form.reset();
            }}>Admit Another</Button>
            <Button onClick={() => router.push(`/${hostelSlug}/dashboard`)}>Go to Dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Link href={`/${hostelSlug}/dashboard`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Admission</h1>
          <p className="text-muted-foreground mt-1">Onboard a new hosteller and process their initial payment.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Section 1: Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic details of the hosteller.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...form.register("name")} placeholder="John Doe" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="father_name">Father's Name *</Label>
              <Input id="father_name" {...form.register("father_name")} placeholder="Richard Doe" />
              {form.formState.errors.father_name && <p className="text-xs text-destructive">{form.formState.errors.father_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="john@example.com" />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" {...form.register("phone")} placeholder="+91 9876543210" />
              {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
              <Input id="aadhaar_number" {...form.register("aadhaar_number")} placeholder="1234 5678 9012" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Permanent Address</Label>
              <Input id="address" {...form.register("address")} placeholder="123 Main St, City, State" />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Academic/Professional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Academic/Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="college">College / Workplace</Label>
              <Input id="college" {...form.register("college")} placeholder="University Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch / Designation</Label>
              <Input id="branch" {...form.register("branch")} placeholder="Computer Science" />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Room Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Room & Admission Date</CardTitle>
            <CardDescription>Assign a room and set the admission date.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date *</Label>
              <Input id="admission_date" type="date" {...form.register("admission_date")} />
              {form.formState.errors.admission_date && <p className="text-xs text-destructive">{form.formState.errors.admission_date.message}</p>}
              <p className="text-xs text-muted-foreground">Rent for this month will be prorated from this date.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_id">Select Room *</Label>
              <Select 
                disabled={isLoadingRooms} 
                onValueChange={(val) => form.setValue("room_id", val || "")}
                value={form.watch("room_id") || ""}
              >
                <SelectTrigger>
                  <span className={form.watch("room_id") ? "truncate" : "text-muted-foreground truncate"}>
                    {(() => {
                      const selectedId = form.watch("room_id");
                      if (!selectedId) return isLoadingRooms ? "Loading rooms..." : "Choose a vacant room";
                      const room = availableRooms.find(r => r.id === selectedId);
                      if (!room) return "Choose a vacant room";
                      return `Room ${room.room_number} (${room.floor} Floor) - ${room.pricing_model?.name || "No Pricing"} (₹${((room.pricing_model?.monthly_amount_paise || 0) / 100).toFixed(0)}/mo)`;
                    })()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.room_number} ({room.floor} Floor) - {room.pricing_model?.name} (₹{((room.pricing_model?.monthly_amount_paise || 0) / 100).toFixed(0)}/mo)
                    </SelectItem>
                  ))}
                  {availableRooms.length === 0 && !isLoadingRooms && (
                    <SelectItem value="none" disabled>No rooms available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.room_id && <p className="text-xs text-destructive">{form.formState.errors.room_id.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Financials & Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Financials & Initial Payment</CardTitle>
            <CardDescription>Configure security deposit, advance rent, and record the payment.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="security_deposit_amount_rupees">Security Deposit (₹) *</Label>
              <Input id="security_deposit_amount_rupees" type="number" {...form.register("security_deposit_amount_rupees")} />
              <p className="text-xs text-muted-foreground">One-time deposit held until tenant exit.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance_months">Advance Rent (Months) *</Label>
              <Input id="advance_months" type="number" {...form.register("advance_months")} />
              <p className="text-xs text-muted-foreground">Total rent months collected upfront (covers admission month + upcoming months).</p>
            </div>

            {/* Live Calculation Breakdown */}
            {selectedRoom && (
              <div className="col-span-1 md:col-span-2 bg-muted/40 p-4 rounded-lg border border-border/50">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Admission Amount Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Rent</p>
                    <p className="font-semibold text-foreground">₹{((selectedRoom.pricing_model?.monthly_amount_paise || 0) / 100).toLocaleString("en-IN")}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rent ({form.watch("advance_months") || 0} mo)</p>
                    <p className="font-semibold text-foreground">
                      ₹{(((selectedRoom.pricing_model?.monthly_amount_paise || 0) / 100) * (form.watch("advance_months") || 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Security Deposit</p>
                    <p className="font-semibold text-foreground">₹{(Number(form.watch("security_deposit_amount_rupees")) || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-primary/10 -m-2 p-2 rounded-md">
                    <p className="text-xs font-medium text-primary">Total Bill & Payment</p>
                    <p className="text-lg font-bold text-primary">
                      ₹{(
                        (((selectedRoom.pricing_model?.monthly_amount_paise || 0) / 100) * (form.watch("advance_months") || 0)) +
                        (Number(form.watch("security_deposit_amount_rupees")) || 0)
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-1 md:col-span-2 border-t pt-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input id="payment_date" type="date" {...form.register("payment_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode *</Label>
                <Select 
                  onValueChange={(val) => form.setValue("payment_mode", (val as any) || "upi")}
                  value={form.watch("payment_mode") || "upi"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payment_reference">Payment Reference (Optional)</Label>
                <Input id="payment_reference" {...form.register("payment_reference")} placeholder="Transaction ID, Cheque Number..." />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 border-t py-4 flex justify-between items-center px-6">
            <p className="text-sm text-muted-foreground">
              This will create the hosteller, allocate rooms, generate initial bills, and record the payment in one atomic action.
            </p>
            <Button type="submit" size="lg" disabled={admissionMutation.isPending}>
              {admissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Admission
            </Button>
          </CardFooter>
        </Card>

      </form>
    </div>
  );
}
