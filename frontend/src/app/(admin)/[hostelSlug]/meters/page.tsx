"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { MeterReadingDto, RoomDto } from "@hosmos/types";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Zap } from "lucide-react";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function MetersPage() {
  const params = useParams();
  const hostelSlug = params.hostelSlug as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Record Form
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [readingValue, setReadingValue] = useState("");
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isReset, setIsReset] = useState(false);
  const [notes, setNotes] = useState("");

  // Assign Form
  const [assignYear, setAssignYear] = useState(currentYear.toString());
  const [assignMonth, setAssignMonth] = useState(currentMonth.toString());

  const { data: readingsResponse, isLoading: isLoadingReadings } = useQuery({
    queryKey: ["meters", hostelSlug],
    queryFn: () => apiClient.getList<MeterReadingDto>("/meters", { "x-hostel-slug": hostelSlug }),
  });

  const { data: roomsResponse } = useQuery({
    queryKey: ["rooms", hostelSlug],
    queryFn: () => apiClient.getList<RoomDto>("/rooms", { "x-hostel-slug": hostelSlug }),
  });

  const readings = readingsResponse?.data || [];
  const rooms = roomsResponse?.data || [];

  const recordMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post("/meters", data, { "x-hostel-slug": hostelSlug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meters", hostelSlug] });
      toast({ title: "Reading Recorded", description: "Meter reading saved successfully." });
      setIsRecordOpen(false);
      // Reset form
      setSelectedRoomId("");
      setReadingValue("");
      setIsReset(false);
      setNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to record reading", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post("/meters/assign", data, { "x-hostel-slug": hostelSlug }),
    onSuccess: (response: any) => {
      toast({ 
        title: "Electricity Assigned", 
        description: `Successfully added electricity charges to ${response.data.assigned} bills. Skipped ${response.data.skipped}.` 
      });
      setIsAssignOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to assign electricity", description: error.message, variant: "destructive" });
    },
  });

  const handleRecord = () => {
    recordMutation.mutate({
      room_id: selectedRoomId,
      reading_value: Number.parseFloat(readingValue),
      reading_date: readingDate,
      is_reset: isReset,
      notes: notes || undefined,
    });
  };

  const handleAssign = () => {
    assignMutation.mutate({
      year: Number.parseInt(assignYear, 10),
      month: Number.parseInt(assignMonth, 10),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meter Readings</h1>
          <p className="text-muted-foreground mt-1">Track sub-meters and assign electricity costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAssignOpen(true)}>
            <Zap className="mr-2 h-4 w-4 text-amber-500" /> Assign Electricity
          </Button>
          <Button onClick={() => setIsRecordOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Record Reading
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="text-right">Reading</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingReadings && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoadingReadings && readings.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No meter readings found.
                </TableCell>
              </TableRow>
            )}
            {!isLoadingReadings && readings.length > 0 && readings.map((reading) => (
              <TableRow key={reading.id}>
                <TableCell className="font-medium">
                  {new Date(reading.reading_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </TableCell>
                <TableCell className="font-semibold">{reading.room_number}</TableCell>
                <TableCell className="text-right font-mono">{reading.reading_value.toFixed(2)}</TableCell>
                <TableCell>
                  {reading.is_reset ? (
                    <Badge variant="destructive">Reset</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Normal</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-50 truncate">
                  {reading.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Record Dialog */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Meter Reading</DialogTitle>
            <DialogDescription>
              Enter the sub-meter reading for a room. Readings should typically be taken on the 1st of the month.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={selectedRoomId} onValueChange={(val) => setSelectedRoomId(val as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(r => (
                      <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={readingDate} 
                  onChange={(e) => setReadingDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reading Value (Units)</Label>
              <Input 
                type="number" 
                step="0.1" 
                placeholder="e.g. 1450.5"
                value={readingValue} 
                onChange={(e) => setReadingValue(e.target.value)} 
              />
            </div>

            <div className="flex items-center space-x-2 rounded-lg border p-4">
              <Switch id="is-reset" checked={isReset} onCheckedChange={setIsReset} />
              <div className="space-y-0.5">
                <Label htmlFor="is-reset">Meter was Reset</Label>
                <p className="text-xs text-muted-foreground">
                  Check this if the meter was replaced or rolled over. Consumption will not be calculated automatically for this cycle.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input 
                placeholder="Any special remarks..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRecord} 
              disabled={recordMutation.isPending || !selectedRoomId || !readingValue || !readingDate}
            >
              {recordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Electricity Costs</DialogTitle>
            <DialogDescription>
              Calculate consumption between the 1st of the previous month and the selected month, and assign costs to the occupants active during that previous month.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Target Year</Label>
              <Select value={assignYear} onValueChange={(val) => setAssignYear(val as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Month (Current Reading)</Label>
              <Select value={assignMonth} onValueChange={(val) => setAssignMonth(val as string)}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assignMutation.isPending}>
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Calculate & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
