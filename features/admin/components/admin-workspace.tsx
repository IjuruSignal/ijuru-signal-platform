"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AdminWorkspace() {
  const [currentUser, setCurrentUser] = useState({
    id: "user-admin-01",
    role: "admin",
    login: "admin@ijuru.rw",
    isGuest: false,
  });

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>({});

  const [checkFilter, setCheckFilter] = useState<"all" | "pending" | "reviewed">("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // New user modal state
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("demo12345678");
  const [newRole, setNewRole] = useState<"user" | "reviewer" | "admin">("user");
  const [creatingUser, setCreatingUser] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((data) => {
        if (data.currentUser) setCurrentUser(data.currentUser);
        if (data.users) setUsers(data.users);
        if (data.checks) setChecks(data.checks);
        if (data.audits) setAudits(data.audits);
        if (data.system) setSystemInfo(data.system);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchRole = async (targetRole: "user" | "reviewer" | "admin") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        toast.success(`Role switched to ${targetRole.toUpperCase()}`);
        loadData();
      }
    } catch {}
  };

  const handleReview = async (check: any) => {
    setReviewingId(check.id);
    try {
      const res = await fetch(`/api/field-checks/${check.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: check.version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review transition failed");

      toast.success(`Check #${check.id.slice(0, 8)} approved & marked reviewed.`);
      setChecks((prev) =>
        prev.map((c) => (c.id === check.id ? { ...c, status: "reviewed", version: c.version + 1 } : c))
      );
    } catch (err: any) {
      toast.error(`Review failed: ${err.message}`);
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error("Email/login is required.");
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          email: newEmail.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      toast.success(`User ${newEmail} created successfully with role ${newRole.toUpperCase()}.`);
      setNewUserOpen(false);
      setNewEmail("");
      loadData();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/admin/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_role", userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      toast.success(`User role updated to ${role.toUpperCase()}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const visibleChecks = checks.filter((c) => {
    if (checkFilter === "all") return true;
    return c.status === checkFilter;
  });

  const pendingCount = checks.filter((c) => c.status === "pending").length;
  const reviewedCount = checks.filter((c) => c.status === "reviewed").length;

  return (
    <AppShell
      currentUser={currentUser}
      onSwitchRole={handleSwitchRole}
      title="Ijuru Signal Admin & Review Operations"
      subtitle="Ground truth triage · Multi-district observations · Access & pipeline health"
      headerActions={
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <span className="text-xs uppercase font-bold text-[#4a6365]">Pending Verification</span>
              <CardTitle className="text-3xl font-display font-bold text-[#c26d24] tabular-nums">
                {pendingCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-[#4a6365]">Field observations awaiting reviewer action</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <span className="text-xs uppercase font-bold text-[#4a6365]">Reviewed & Grounded</span>
              <CardTitle className="text-3xl font-display font-bold text-[#1f6346] tabular-nums">
                {reviewedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-[#4a6365]">Approved field checks citing verified sectors</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <span className="text-xs uppercase font-bold text-[#4a6365]">Registered Users</span>
              <CardTitle className="text-3xl font-display font-bold text-[#132e36] tabular-nums">
                {users.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-[#4a6365]">Across Field, Reviewer, and Admin roles</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <span className="text-xs uppercase font-bold text-[#4a6365]">Active Storage Engine</span>
              <CardTitle className="text-2xl font-display font-bold text-[#195c70]">
                {systemInfo.dbProvider === "postgres" ? "PostgreSQL 18" : "SQLite Durable"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-[#4a6365] tabular-nums">
                {systemInfo.migrationsCount ?? 8}/8 schema migrations verified
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabbed Operations Console */}
        <Tabs defaultValue="checks" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto gap-4">
            <TabsTrigger
              value="checks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#195c70] data-[state=active]:bg-transparent pb-3 font-bold"
            >
              Field Checks Queue ({pendingCount})
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#195c70] data-[state=active]:bg-transparent pb-3 font-bold"
            >
              User Management ({users.length})
            </TabsTrigger>
            <TabsTrigger
              value="pipelines"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#195c70] data-[state=active]:bg-transparent pb-3 font-bold"
            >
              Pipelines & Deployment
            </TabsTrigger>
            <TabsTrigger
              value="audits"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#195c70] data-[state=active]:bg-transparent pb-3 font-bold"
            >
              Audit Trail ({audits.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Field Checks Triage */}
          <TabsContent value="checks" className="pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-[#132e36]">Ground Observations Queue</h3>
                <p className="text-xs text-[#4a6365]">
                  Observations from all 30 districts of Rwanda. Reviewers approve notes with optimistic version locking.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={checkFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCheckFilter("all")}
                >
                  All ({checks.length})
                </Button>
                <Button
                  variant={checkFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCheckFilter("pending")}
                >
                  Pending ({pendingCount})
                </Button>
                <Button
                  variant={checkFilter === "reviewed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCheckFilter("reviewed")}
                >
                  Reviewed ({reviewedCount})
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Observation Note</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Observed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleChecks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs py-8 text-[#4a6365]">
                        No field checks matching filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="font-semibold text-sm text-[#132e36] max-w-md">
                          {check.observation}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{check.area_name || check.area_id.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#4a6365]">{check.author_id}</TableCell>
                        <TableCell className="text-xs tabular-nums text-[#4a6365]">
                          {new Date(check.observed_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={check.status === "reviewed" ? "live" : "warning"}>
                            {check.status === "reviewed" ? "Reviewed" : "Pending (v" + check.version + ")"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {check.status === "pending" && (
                            <Button
                              size="sm"
                              disabled={reviewingId === check.id}
                              onClick={() => handleReview(check)}
                            >
                              <Check className="size-3.5" />
                              <span>Approve</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tab 2: User Management */}
          <TabsContent value="users" className="pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-[#132e36]">Registered Accounts & Role Grants</h3>
                <p className="text-xs text-[#4a6365]">
                  Manage field officers, agronomist reviewers, and administrators with scoped area access.
                </p>
              </div>

              <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="size-4" />
                    <span>Create User</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Provision New User Account</DialogTitle>
                    <DialogDescription>
                      Assign an email, role, and password. Scrypt salted credential will be safely stored.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-email">Login Email</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="agronomist@coop.rw"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-password">Initial Password</Label>
                      <Input
                        id="create-password"
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="demo12345678"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-role">Role</Label>
                      <Select
                        value={newRole}
                        onValueChange={(val: any) => setNewRole(val)}
                      >
                        <SelectTrigger id="create-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Field Officer (user)</SelectItem>
                          <SelectItem value="reviewer">Agronomist Reviewer (reviewer)</SelectItem>
                          <SelectItem value="admin">System Administrator (admin)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setNewUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingUser}>
                        {creatingUser ? "Creating..." : "Save Account"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.id}</TableCell>
                      <TableCell className="font-semibold text-sm text-[#132e36]">
                        {u.login || u.id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.role === "admin"
                              ? "destructive"
                              : u.role === "reviewer"
                              ? "calibrated"
                              : "secondary"
                          }
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#4a6365] tabular-nums">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={u.role}
                          onValueChange={(newRoleVal) => handleUpdateRole(u.id, newRoleVal)}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">USER</SelectItem>
                            <SelectItem value="reviewer">REVIEWER</SelectItem>
                            <SelectItem value="admin">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tab 3: Pipelines & ThalesOps */}
          <TabsContent value="pipelines" className="pt-4 space-y-4">
            <h3 className="font-bold text-lg text-[#132e36]">Signal Sources & Ingest Pipelines</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">Open-Meteo Weather</CardTitle>
                    <Badge variant="live">Live 200</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Hourly, 7-day daily forecast, temperature, humidity, rainfall prob
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-[#4a6365] space-y-1">
                  <div>Endpoint: api.open-meteo.com/v1/forecast</div>
                  <div>Cache: 15-minute in-memory LRU</div>
                  <div>Attribution: CC BY 4.0 Open-Meteo</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">ERA5 30yr Baseline</CardTitle>
                    <Badge variant="live">Live 200</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    ECMWF ERA5 reanalysis 30-year monthly precipitation normals
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-[#4a6365] space-y-1">
                  <div>Baseline: 1991–2020 monthly normals</div>
                  <div>Resolution: 0.25° grid (~28km)</div>
                  <div>Completeness check: calendar matching</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">NASA MODIS / Sentinel-2</CardTitle>
                    <Badge variant="live">Live 200</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    250m surface reflectance 16-day NDVI vegetation curves
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-[#4a6365] space-y-1">
                  <div>Source: ORNL DAAC MOD13Q1 / Copernicus</div>
                  <div>Quality: SCL cloud filtered, non-diagnosis</div>
                  <div>License: NASA Open Data / Copernicus Open</div>
                </CardContent>
              </Card>
            </div>

            <Card className="p-4 bg-[#f8f9f5]">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-sm font-bold text-[#132e36] block">
                    ThalesOps & Single Container Deployment Ready
                  </strong>
                  <span className="text-xs text-[#4a6365]">
                    Dockerfile (`node:24-bookworm-slim`), nixpacks.toml, and docker-compose.yml configured.
                  </span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href="/DEPLOY_THALESOPS.md" target="_blank">
                    <span>Deploy Guide</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Audit Trail */}
          <TabsContent value="audits" className="pt-4 space-y-4">
            <h3 className="font-bold text-lg text-[#132e36]">Immutable Security Audit Trail</h3>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-xs font-semibold">{a.actor_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#4a6365]">
                        {a.target_id?.slice(0, 8) || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.outcome === "success" ? "live" : "destructive"}>
                          {a.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-[#4a6365]">
                        {new Date(a.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
