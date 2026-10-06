"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import type { RoomDto, PricingModelDto, CreateRoomRequest } from "@hosmos/types";

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
import { Bed, Plus, Loader2, Edit, Trash2 } from "lucide-react";

const roomSchema = z.object({
  room_number: z.string().min(1, "Room number is required"),
  floor: z.string().min(1, "Floor is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  pricing_model_id: z.string().optional().or(z.literal("none")),
});

export default function RoomsPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomDto | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<RoomDto | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: roomsResponse, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms", hostelSlug],
    queryFn: () => apiClient.getList<RoomDto>("/rooms", { "x-hostel-slug": hostelSlug }),
  });

  const { data: pricingResponse } = useQuery({
    queryKey: ["pricing", hostelSlug],
    queryFn: () => apiClient.getList<PricingModelDto>("/pricing", { "x-hostel-slug": hostelSlug }),
  });

  const rooms = roomsResponse?.data || [];
  const pricingModels = pricingResponse?.data || [];

  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      room_number: "",
      floor: "Ground",
      capacity: 2,
      pricing_model_id: "none",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, pricing_model_id: string | undefined }) => 
      apiClient.put(`/rooms/${data.id}`, { pricing_model_id: data.pricing_model_id }, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", hostelSlug] });
      toast({ title: "Success", description: "Room updated successfully." });
      setEditingRoom(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update room.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${id}`, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", hostelSlug] });
      toast({ title: "Success", description: "Room deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete room.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRoomRequest) => apiClient.post<CreateRoomRequest, RoomDto>("/rooms", data, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", hostelSlug] });
      toast({ title: "Success", description: "Room created successfully." });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create room.", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof roomSchema>) => {
    createMutation.mutate({
      room_number: values.room_number,
      floor: values.floor,
      capacity: values.capacity,
      pricing_model_id: values.pricing_model_id === "none" ? undefined : values.pricing_model_id,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground mt-2">Manage rooms, capacity, and assignments.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Add Room
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>Create a new room in this property.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room_number">Room Number</Label>
                  <Input id="room_number" {...form.register("room_number")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input id="floor" placeholder="e.g., Ground, 1st, 2" {...form.register("floor")} />
                  <p className="text-xs text-muted-foreground">Enter a floor name or number.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (Beds)</Label>
                <Input id="capacity" type="number" {...form.register("capacity")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricing">Pricing Model (Optional)</Label>
                <Controller
                  control={form.control}
                  name="pricing_model_id"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <SelectTrigger className="w-full">
                        <span className={field.value && field.value !== "none" ? "truncate" : "text-muted-foreground truncate"}>
                          {field.value === "none" 
                            ? "No Pricing Model yet" 
                            : pricingModels.find(p => p.id === field.value)?.name || "Select a pricing model"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Pricing Model yet</SelectItem>
                        {pricingModels.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Room
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rooms</CardTitle>
          <CardDescription>A complete list of all rooms configured for this hostel.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRooms ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bed className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No rooms found. Add a room to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Pricing Plan</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => {
                    const isFull = room.active_occupant_count >= room.capacity;
                    return (
                      <TableRow
                        key={room.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/${hostelSlug}/rooms/${room.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-md">
                              <Bed className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-primary font-semibold">
                              {room.room_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{room.floor}</TableCell>
                        <TableCell>{room.capacity} Beds</TableCell>
                        <TableCell>
                          <Badge variant={isFull ? "default" : "secondary"}>
                            {room.active_occupant_count} / {room.capacity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {room.pricing_model?.name || <span className="text-muted-foreground italic">None</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoom(room);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoomToDelete(room);
                              setDeleteConfirmText("");
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Edit Room Dialog */}
        <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room: {editingRoom?.room_number}</DialogTitle>
              <DialogDescription>
                Only the pricing model can be edited, and only when there are no occupants.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pricing Model</Label>
                <Select 
                  value={editingRoom?.pricing_model_id || "none"}
                  onValueChange={(val) => setEditingRoom(editingRoom ? { ...editingRoom, pricing_model_id: val === "none" ? null : val } : null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select pricing model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Pricing Model</SelectItem>
                    {pricingModels.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (editingRoom) {
                    updateMutation.mutate({ 
                      id: editingRoom.id, 
                      pricing_model_id: editingRoom.pricing_model_id === "none" ? undefined : (editingRoom.pricing_model_id || undefined)
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

        {/* Delete Room Dialog */}
        <Dialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Room</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete room {roomToDelete?.room_number}?
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
              <Button type="button" variant="outline" onClick={() => setRoomToDelete(null)}>Cancel</Button>
              <Button 
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
                onClick={() => {
                  if (roomToDelete) {
                    deleteMutation.mutate(roomToDelete.id, {
                      onSuccess: () => setRoomToDelete(null)
                    });
                  }
                }}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
