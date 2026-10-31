"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radar, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "reviewer" | "admin">("user");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      toast.success("Account registered and signed in!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
            Create a New Field or Reviewer Account
          </p>
        </div>

        {/* Card */}
        <Card className="border-[#cddad4] shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#132e36]">
              Create an Account
            </CardTitle>
            <CardDescription className="text-xs">
              Open registration: anyone can join as field worker, reviewer, or administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@domain.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password (min 8 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Initial Account Role</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Field Practitioner (submit ground observations)</SelectItem>
                    <SelectItem value="reviewer">Agronomist Reviewer (audit & verify checks)</SelectItem>
                    <SelectItem value="admin">Administrator (system & user management)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                <UserPlus className="size-4 mr-1.5" />
                <span>{loading ? "Creating Account..." : "Create Account & Sign In"}</span>
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-0 text-center">
            <p className="text-xs text-[#4a6365]">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-bold text-[#195c70] hover:underline">
                Sign in
              </Link>
            </p>
            <Link href="/" className="text-xs text-[#4a6365] hover:underline">
              ← Continue as guest
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
