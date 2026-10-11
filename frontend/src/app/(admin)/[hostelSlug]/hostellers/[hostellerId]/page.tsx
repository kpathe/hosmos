"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { HostellerDetailsDto, RoomDto } from "@hosmos/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Bed,
  Calendar,
  Shield,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  BookOpen,
  Loader2,
} from "lucide-react";

const MONTHS = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function HostellerDetailPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const hostellerId = params.hostellerId as string;

  const { data: response, isLoading } = useQuery({
    queryKey: ["hosteller-details", hostellerId],
    queryFn: () =>
      apiClient.get<HostellerDetailsDto>(`/hostellers/${hostellerId}/details`, {
        "x-hostel-slug": hostelSlug,
      }),
  });

  const details = response;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [isChangeRoomOpen, setIsChangeRoomOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: roomsResponse } = useQuery({
    queryKey: ["rooms", hostelSlug],
    queryFn: () => apiClient.getList<RoomDto>("/rooms", { "x-hostel-slug": hostelSlug }),
  });
  const roomsList = roomsResponse?.data || [];

  const changeRoomMutation = useMutation({
    mutationFn: (roomId: string) => apiClient.put(`/hostellers/${hostellerId}/room`, { room_id: roomId }, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hosteller-details", hostellerId] });
      toast({ title: "Success", description: "Occupancy changed successfully." });
      setIsChangeRoomOpen(false);
      setNewRoomId("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to change room.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/hostellers/${hostellerId}`, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      toast({ title: "Success", description: "Hosteller deleted successfully." });
      router.push(`/${hostelSlug}/hostellers`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete hosteller.", variant: "destructive" });
    },
  });


  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 col-span-1" />
          <Skeleton className="h-64 col-span-2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <User className="mx-auto h-12 w-12 opacity-40 mb-4" />
        <p>Hosteller not found.</p>
      </div>
    );
  }

  const { hosteller, current_room, security_deposit, bills, payments } = details;
  const currentBill = bills.find(b => b.status === "unpaid");
  const paidBills = bills.filter(b => b.status === "paid");

  const statusColor: Record<string, string> = {
    admitted: "bg-blue-500/10 text-blue-600 border-blue-200",
    active: "bg-green-500/10 text-green-600 border-green-200",
    exit_pending: "bg-amber-500/10 text-amber-600 border-amber-200",
    removed: "bg-red-500/10 text-red-600 border-red-200",
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Link href={`/${hostelSlug}/hostellers`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hostellers
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{hosteller.name}</h1>
          {hosteller.father_name && (
            <p className="text-muted-foreground">D/S of {hosteller.father_name}</p>
          )}
          <span
            className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
              statusColor[hosteller.status] || ""
            }`}
          >
            {hosteller.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Top row: Profile + Room + Security Deposit */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={hosteller.email} />
            <InfoRow icon={Phone} label="Phone" value={hosteller.phone} />
            <InfoRow icon={Building} label="College" value={hosteller.college} />
            <InfoRow icon={BookOpen} label="Branch" value={hosteller.branch} />
            <InfoRow icon={User} label="Address" value={hosteller.address} />
            <InfoRow
              icon={Calendar}
              label="Admission Date"
              value={new Date(hosteller.admission_date).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {/* Current Room */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Current Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            {current_room ? (
              <div className="space-y-3">
                <div className="text-4xl font-bold text-primary">
                  {current_room.room_number}
                </div>
                <div className="text-sm text-muted-foreground">
                  Floor: <span className="font-medium text-foreground">{current_room.floor}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Since:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(current_room.effective_from).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active room assigned.</p>
            )}
          </CardContent>
        </Card>

        {/* Security Deposit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {security_deposit ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold">{formatRupees(security_deposit.original_amount_paise)}</p>
                </div>
                {security_deposit.deductions_paise > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Deductions</p>
                    <p className="text-base font-semibold text-destructive">
                      -{formatRupees(security_deposit.deductions_paise)}
                    </p>
                  </div>
                )}
                <Badge variant={security_deposit.status === "held" ? "secondary" : "default"}>
                  {security_deposit.status}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No security deposit recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Unpaid Bill */}
      {currentBill && (
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Bill — {MONTHS[currentBill.billing_period_month]} {currentBill.billing_period_year}
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                Unpaid
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="text-2xl font-bold">{formatRupees(currentBill.total_amount_paise)}</span>
            </div>
            <div className="space-y-2 border-t pt-4">
              {currentBill.items.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{item.item_type.replace("_", " ")} — {item.description}</span>
                  <span className={item.amount_paise < 0 ? "text-green-600" : ""}>
                    {item.amount_paise < 0 ? "-" : ""}{formatRupees(Math.abs(item.amount_paise))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment History
            </CardTitle>
            <CardDescription>{payments.length} payment(s) recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{payment.record_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString("en-IN")} · {payment.mode.toUpperCase()}
                        {payment.description && ` · ${payment.description}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatRupees(payment.amount_paise)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {paidBills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Billing History
            </CardTitle>
            <CardDescription>{paidBills.length} paid bill(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paidBills.map(bill => (
                <details
                  key={bill.id}
                  className="group border rounded-lg overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50 transition-colors list-none">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {MONTHS[bill.billing_period_month]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {MONTHS[bill.billing_period_month]} {bill.billing_period_year}
                        </p>
                        {bill.paid_at && (
                          <p className="text-xs text-muted-foreground">
                            Paid on {new Date(bill.paid_at).toLocaleDateString("en-IN")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatRupees(bill.total_amount_paise)}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
                    </div>
                  </summary>
                  <div className="border-t px-3 py-3 bg-muted/20 space-y-2">
                    {bill.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {item.item_type.replace("_", " ")} — {item.description}
                        </span>
                        <span className={item.amount_paise < 0 ? "text-green-600" : ""}>
                          {item.amount_paise < 0 ? "-" : ""}{formatRupees(Math.abs(item.amount_paise))}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Room Dialog */}
      <Dialog open={isChangeRoomOpen} onOpenChange={setIsChangeRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Room</DialogTitle>
            <DialogDescription>
              Assign the hosteller to a new room. This will close their current occupancy and start a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select New Room</Label>
              <Select value={newRoomId} onValueChange={(val) => setNewRoomId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {roomsList.map((r: RoomDto) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.room_number} (Floor {r.floor}, {r.capacity} Beds)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoomOpen(false)}>Cancel</Button>
            <Button 
              disabled={!newRoomId || changeRoomMutation.isPending}
              onClick={() => changeRoomMutation.mutate(newRoomId)}
            >
              {changeRoomMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Hosteller Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hosteller</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {details?.hosteller?.name}? This will remove all their records including bills and payments.
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Hosteller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
