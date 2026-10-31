"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RWANDA_DISTRICTS } from "@/features/locations/data/rwanda-districts";
import { toast } from "sonner";

export default function FieldChecksPage() {
  const [currentUser, setCurrentUser] = useState({
    id: "user-field-01",
    role: "user",
    login: "field@ijuru.rw",
    isGuest: true,
  });

  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed">("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New check state
  const [selectedDistrict, setSelectedDistrict] = useState("kigali");
  const [observationText, setObservationText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadChecks = () => {
    setLoading(true);
    fetch("/api/field-checks")
      .then((r) => r.json())
      .then((d) => {
        if (d.checks) setChecks(d.checks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});

    loadChecks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observationText.trim()) {
      toast.error("Please enter observation details.");
      return;
    }

    setSubmitting(true);
    try {
      const dist = RWANDA_DISTRICTS.find((d) => d.id === selectedDistrict);
      const res = await fetch("/api/field-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: selectedDistrict,
          areaName: dist?.name || selectedDistrict,
          observation: observationText.trim(),
          observedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record observation");

      toast.success("Field observation successfully recorded.");
      setObservationText("");
      loadChecks();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/field-checks/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review submission failed");
      toast.success("Observation verified and marked as reviewed.");
      loadChecks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredChecks = checks.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (districtFilter !== "all" && c.area_id !== districtFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (c.observation || "").toLowerCase().includes(q);
      const matchArea = (c.area_id || "").toLowerCase().includes(q);
      const matchAuthor = (c.author_id || "").toLowerCase().includes(q);
      if (!matchText && !matchArea && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <AppShell
      currentUser={currentUser}
      title="Field Observations & Verification Triage"
      subtitle="Human ground-truthing to ground satellite and weather models across Rwanda"
    >
      <div className="space-y-6">
        {/* Record Observation Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#132e36]">
                  Record Field Observation
                </CardTitle>
                <CardDescription className="text-xs">
                  Ground evidence collected by extension officers, agronomists, and local observers.
                </CardDescription>
              </div>
              <Badge variant="live" className="gap-1.5">
                <span className="size-2 rounded-full bg-[#185432] animate-pulse" />
                Active Session: {currentUser.role.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#132e36] mb-1.5 block">
                    Select Rwanda District:
                  </label>
                  <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Choose district" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {RWANDA_DISTRICTS.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.province.replace(" Province", "")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#132e36] mb-1.5 block">
                    Observation & Crop Ground Truth:
                  </label>
                  <Textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Enter factual observations (e.g., dry topsoil on terraced hillsides, riverbanks stable, maize cob filling stage)..."
                    className="bg-white min-h-[74px]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Button type="submit" disabled={submitting || !observationText.trim()}>
                  <Send className="size-3.5 mr-1.5" />
                  <span>Submit Ground Observation</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Observations List & Triage */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-[#132e36]">
                  Verification & Triage Queue ({filteredChecks.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and audit field observations logged across all 30 districts.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#4a6365]" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search observations..."
                    className="pl-8 h-8 w-44 text-xs bg-white"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={loadChecks}>
                  <RefreshCw className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="p-8 text-center text-xs text-[#4a6365]">
                Loading observations...
              </div>
            ) : filteredChecks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4a6365] border border-dashed rounded-xl">
                No observations match the current filter criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>District</TableHead>
                    <TableHead>Observation</TableHead>
                    <TableHead>Observer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChecks.map((fc) => (
                    <TableRow key={fc.id}>
                      <TableCell className="font-bold text-[#132e36] capitalize whitespace-nowrap">
                        {fc.area_id}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-xs font-semibold text-[#132e36]">{fc.observation}</p>
                        {fc.review_notes && (
                          <p className="text-[11px] text-[#195c70] mt-1 bg-[#eaf2f4] p-1.5 rounded">
                            Review note: {fc.review_notes}
                          </p>
                        )}
                        <span className="text-[10px] text-[#4a6365] block mt-0.5">
                          {new Date(fc.observed_at || fc.created_at).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#4a6365] whitespace-nowrap">
                        {fc.author_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant={fc.status === "reviewed" ? "live" : "warning"}>
                          {fc.status === "reviewed" ? "Reviewed" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {fc.status !== "reviewed" &&
                        (currentUser.role === "reviewer" || currentUser.role === "admin") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleReview(fc.id, "Verified by agronomist reviewer via workspace")
                            }
                            className="h-7 text-xs"
                          >
                            <Check className="size-3 mr-1 text-[#185432]" />
                            <span>Mark Reviewed</span>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                            <Link href={`/places/${fc.area_id}`}>View District</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
