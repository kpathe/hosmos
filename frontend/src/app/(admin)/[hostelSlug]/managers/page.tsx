"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import type { ManagerDto, CreateManagerRequest } from "@hosmos/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, Edit, Trash2 } from "lucide-react";

const managerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password_plain: z.string().min(8, "Password must be at least 8 characters"),
});

export default function ManagersPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ["managers", hostelSlug],
    queryFn: () => apiClient.getList<ManagerDto>("/managers", { "x-hostel-slug": hostelSlug }),
  });

  const managers = response?.data || [];

  const form = useForm<z.infer<typeof managerSchema>>({
    resolver: zodResolver(managerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password_plain: "",
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/managers/${id}`, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers", hostelSlug] });
      toast({ title: "Success", description: "Manager removed successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove manager.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateManagerRequest) => apiClient.post<CreateManagerRequest, ManagerDto>("/managers", data, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers", hostelSlug] });
      toast({ title: "Success", description: "Manager added successfully." });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add manager.", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof managerSchema>) => {
    createMutation.mutate({
      ...values,
      phone: values.phone || undefined,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Managers</h1>
          <p className="text-muted-foreground mt-2">Manage staff members for this hostel.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Add Manager
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Manager</DialogTitle>
              <DialogDescription>Invite a new manager to help run this property.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input id="phone" type="tel" {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_plain">Temporary Password</Label>
                <Input id="password_plain" type="text" {...form.register("password_plain")} />
                <p className="text-xs text-muted-foreground">The manager will be forced to change this upon first login.</p>
                {form.formState.errors.password_plain && <p className="text-sm text-destructive">{form.formState.errors.password_plain.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Manager
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
          <CardDescription>All active managers assigned to this property.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : managers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No managers found. You are managing this property alone.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        {manager.name}
                      </TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{manager.phone || <span className="text-muted-foreground italic">None</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toast({ title: "Info", description: "Editing managers is coming soon." })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this manager?")) {
                              deleteMutation.mutate(manager.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
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
    </div>
  );
}
