"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Compass,
  ExternalLink,
  LogIn,
  MapPin,
  Radar,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface AppShellUser {
  id: string;
  role: "admin" | "reviewer" | "user" | string;
  login?: string;
  isGuest?: boolean;
}

interface AppShellProps {
  children: React.ReactNode;
  currentUser?: AppShellUser;
  onSwitchRole?: (role: "user" | "reviewer" | "admin") => void;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: "/",
    label: "National & District Map",
    shortLabel: "Explore",
    Icon: Compass,
  },
  {
    href: "/places/kigali",
    label: "District Deep Briefing",
    shortLabel: "Briefing",
    Icon: MapPin,
  },
  {
    href: "/field-checks",
    label: "Field Observations",
    shortLabel: "Field Checks",
    Icon: ClipboardCheck,
  },
  {
    href: "/assistant",
    label: "Climate AI Assistant",
    shortLabel: "AI Assistant",
    Icon: Sparkles,
  },
  {
    href: "/admin",
    label: "Admin & Operations",
    shortLabel: "Admin",
    Icon: ShieldCheck,
  },
];

export function AppShell({
  children,
  currentUser = { id: "user-field-01", role: "user", login: "guest@ijuru.rw", isGuest: true },
  onSwitchRole,
  title,
  subtitle,
  headerActions,
}: AppShellProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/places")) return pathname.startsWith("/places");
    return pathname.startsWith(href);
  };

  const roleLabel =
    currentUser.role === "admin"
      ? "Administrator"
      : currentUser.role === "reviewer"
      ? "Agronomist Reviewer"
      : "Field Practitioner";

  return (
    <div className="min-h-screen bg-[#f3f4ee] text-[#132e36] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col bg-[#132e36] text-[#f3f4ee] px-4 py-6 border-r border-[#1f4651] sticky top-0 h-screen">
        <Link
          href="/"
          className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-[#f3f4ee] no-underline"
        >
          <span className="size-9 rounded-full border border-[#8bc3b9] bg-[#195c70] flex items-center justify-center text-[#e3ed8c]">
            <Radar className="size-5" />
          </span>
          <div>
            <span className="block font-bold tracking-wider text-sm">
              IJURU SIGNAL
            </span>
            <span className="block text-[11px] text-[#b8d0cb]">
              Rwanda Climate Evidence
            </span>
          </div>
        </Link>

        <nav
          aria-label="Primary workspace navigation"
          className="mt-7 flex flex-col gap-1.5"
        >
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold no-underline transition-colors ${
                  active
                    ? "bg-[#e3ed8c] text-[#132e36]"
                    : "text-[#d9eae5] hover:bg-[#1b4652] hover:text-white"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Instant Role Switcher & Account Access */}
        <div className="mt-auto pt-5 border-t border-[#244e5a] space-y-3">
          <div className="rounded-xl bg-[#183b45] p-3 border border-[#275461]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f3f4ee]">
                <UserCheck className="size-4 text-[#e3ed8c]" />
                <span>{roleLabel}</span>
              </div>
              <span className="text-[11px] rounded-md bg-[#245664] px-2 py-0.5 text-[#d9eae5]">
                {currentUser.isGuest ? "Open Access" : "Signed In"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#b8d0cb] truncate">
              {currentUser.login || currentUser.id}
            </p>

            {onSwitchRole && (
              <div className="mt-2.5 pt-2.5 border-t border-[#275461]">
                <span className="block text-[11px] text-[#b8d0cb] mb-1.5">
                  Switch active workspace role:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: "user", label: "Field" },
                      { id: "reviewer", label: "Reviewer" },
                      { id: "admin", label: "Admin" },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSwitchRole(r.id)}
                      className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        currentUser.role === r.id
                          ? "bg-[#e3ed8c] text-[#132e36]"
                          : "bg-[#132e36] text-[#d9eae5] hover:bg-[#23525f]"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e3ed8c] hover:underline"
            >
              <LogIn className="size-3.5" />
              <span>Account & Sign Up</span>
            </Link>
            <a
              href="https://www.meteorwanda.gov.rw/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#b8d0cb] hover:text-white"
            >
              <span>Meteo RW</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-[#d5dfda] bg-white/95 backdrop-blur-xs px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="lg:hidden flex items-center gap-2 font-bold text-sm text-[#132e36] no-underline shrink-0"
            >
              <span className="size-8 rounded-full bg-[#132e36] text-[#e3ed8c] flex items-center justify-center">
                <Radar className="size-4" />
              </span>
              <span>IJURU</span>
            </Link>
            {title && (
              <div className="min-w-0">
                <strong className="block text-sm sm:text-base font-semibold text-[#132e36] truncate">
                  {title}
                </strong>
                {subtitle && (
                  <span className="hidden sm:block text-xs text-[#4a6365] truncate">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions}
            <Badge variant="calibrated" className="hidden sm:inline-flex">
              {roleLabel}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">
                <LogIn className="size-3.5" />
                <span className="hidden sm:inline">
                  {currentUser.isGuest ? "Sign In / Join" : "Account"}
                </span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#d5dfda] bg-white/60 px-4 sm:px-8 py-5 text-xs text-[#4a6365]">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <strong className="text-[#132e36]">Ijuru Signal</strong> · Climate Evidence & Field Verification Workspace for Rwanda. Forecast and satellite indicators support human judgment; they do not replace{" "}
              <a
                href="https://www.meteorwanda.gov.rw/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#195c70] underline"
              >
                Meteo Rwanda
              </a>{" "}
              official warnings.
            </div>
            <div className="flex items-center gap-4">
              <span>Sources: Open-Meteo · ERA5 · MODIS/Sentinel-2 · NISR ADM2</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#d5dfda] bg-[#132e36] text-[#f3f4ee] grid grid-cols-5 px-1 py-1"
      >
        {NAV_ITEMS.map(({ href, shortLabel, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg text-[11px] font-semibold no-underline ${
                active ? "bg-[#e3ed8c] text-[#132e36]" : "text-[#d9eae5]"
              }`}
            >
              <Icon className="size-4 mb-0.5" />
              <span className="truncate max-w-full px-1">{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
