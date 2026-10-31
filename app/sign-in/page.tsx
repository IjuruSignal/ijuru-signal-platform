"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radar, ArrowRight, ShieldCheck, UserCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("field@ijuru.rw");
  const [password, setPassword] = useState("demo12345678");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      toast.success(`Welcome back, ${data.user.role.toUpperCase()}!`);
      router.push("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleBypass = async (role: "user" | "reviewer" | "admin") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.user) {
        toast.success(`Active role set to ${role.toUpperCase()}`);
        router.push("/");
      }
    } catch {
      toast.error("Failed to switch role");
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4ee] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="size-12 rounded-2xl bg-[#132e36] text-[#e3ed8c] mx-auto flex items-center justify-center shadow-md">
            <Radar className="size-6" />
          </div>
          <h1 className="text-2xl font-bold font-display text-[#132e36]">
            IJURU SIGNAL
          </h1>
          <p className="text-xs text-[#4a6365]">
            Authoritative Rwanda Climate Evidence & Field Verification
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-[#cddad4] shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#132e36]">
              Sign In to Workspace
            </CardTitle>
            <CardDescription className="text-xs">
              Log in with credentials or choose instant guest access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In with Password"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#d5dfda]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#fcfdfa] px-2 text-[#4a6365] font-semibold">
                  Or Instant 1-Click Access
                </span>
              </div>
            </div>

            {/* Instant Demo Roles */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRoleBypass("user")}
                className="text-xs flex flex-col h-auto py-2"
              >
                <span className="font-bold">Practitioner</span>
                <span className="text-[10px] text-[#4a6365]">Field checks</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRoleBypass("reviewer")}
                className="text-xs flex flex-col h-auto py-2"
              >
                <span className="font-bold">Agronomist</span>
                <span className="text-[10px] text-[#4a6365]">Reviewer</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRoleBypass("admin")}
                className="text-xs flex flex-col h-auto py-2"
              >
                <span className="font-bold">Admin</span>
                <span className="text-[10px] text-[#4a6365]">Full control</span>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-0 text-center">
            <p className="text-xs text-[#4a6365]">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-bold text-[#195c70] hover:underline">
                Register new account
              </Link>
            </p>
            <Link href="/" className="text-xs text-[#4a6365] hover:underline">
              ← Continue as anonymous guest
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
