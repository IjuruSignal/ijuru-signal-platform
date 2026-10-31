"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CopilotChat } from "@/features/ai/components/copilot-chat";
import { RWANDA_DISTRICTS } from "@/features/locations/data/rwanda-districts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function AssistantContent() {
  const searchParams = useSearchParams();
  const districtParam = searchParams.get("district");
  const [districtId, setDistrictId] = useState("kigali");

  useEffect(() => {
    if (districtParam) {
      const match = RWANDA_DISTRICTS.find(
        (d) => d.id.toLowerCase() === districtParam.toLowerCase()
      );
      if (match) setDistrictId(match.id);
    }
  }, [districtParam]);

  const currentDistrict =
    RWANDA_DISTRICTS.find((d) => d.id === districtId) || RWANDA_DISTRICTS[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* District Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#d5dfda] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#195c70] text-[#e3ed8c] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#132e36]">
                Target District: {currentDistrict.name}
              </h2>
              <Badge variant="signal">{currentDistrict.province}</Badge>
            </div>
            <span className="text-xs text-[#4a6365]">
              {currentDistrict.agroZone} · {currentDistrict.elevation}m altitude
            </span>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <Select value={districtId} onValueChange={setDistrictId}>
            <SelectTrigger className="bg-[#fcfdfa]">
              <SelectValue placeholder="Switch district" />
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
      </div>

      {/* Official Meteo Warning Notice */}
      <Alert variant="warning" className="bg-[#f9ecd2] border-[#e6cca0]">
        <ShieldAlert className="size-5 text-[#8f5d17]" />
        <div>
          <AlertTitle className="text-sm font-bold text-[#6e4715]">
            Meteo Rwanda Official Advisories Notice
          </AlertTitle>
          <AlertDescription className="text-xs text-[#6e4715]/90 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              The assistant reasons over satellite indices and numerical forecasts as agricultural planning aids. Severe weather warnings are issued exclusively by{" "}
              <strong>Rwanda Meteorology Agency</strong>.
            </span>
            <a
              href="https://www.meteorwanda.gov.rw/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold underline shrink-0 hover:text-[#422906]"
            >
              <span>Visit meteorwanda.gov.rw</span>
              <ExternalLink className="size-3" />
            </a>
          </AlertDescription>
        </div>
      </Alert>

      {/* Dedicated Streaming Copilot Chat Component */}
      <CopilotChat districtId={districtId} districtName={currentDistrict.name} />
    </div>
  );
}

export default function AssistantPage() {
  return (
    <AppShell
      title="Climate Evidence AI Assistant"
      subtitle="Context-grounded streaming analysis of weather, ERA5 30-year anomaly, satellite NDVI, and local checks"
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-[#4a6365]">Loading assistant...</div>}>
        <AssistantContent />
      </Suspense>
    </AppShell>
  );
}
