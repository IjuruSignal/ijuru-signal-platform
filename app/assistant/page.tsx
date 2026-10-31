"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CopilotChat } from "@/features/ai/components/copilot-chat";
import { RWANDA_DISTRICTS } from "@/features/locations/data/rwanda-districts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, ShieldAlert, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AssistantPage() {
  const [districtId, setDistrictId] = useState("kigali");
  const currentDistrict = RWANDA_DISTRICTS.find((d) => d.id === districtId) || RWANDA_DISTRICTS[0];

  return (
    <AppShell
      title="Climate Evidence AI Assistant"
      subtitle="Context-grounded analysis of Open-Meteo forecasts, ERA5 historical anomalies, NASA MODIS NDVI, and ground observations"
    >
      <div className="space-y-6">
        {/* District Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#d5dfda]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#195c70] text-[#e3ed8c] flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#132e36]">
                Target District for Synthesis: {currentDistrict.name}
              </h2>
              <span className="text-xs text-[#4a6365]">
                {currentDistrict.province} · {currentDistrict.agroZone}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <Select value={districtId} onValueChange={setDistrictId}>
              <SelectTrigger className="bg-[#f8faf8]">
                <SelectValue placeholder="Select district" />
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

        {/* Warning Alert */}
        <Alert variant="warning" className="bg-[#f9ecd2] border-[#e6cca0]">
          <ShieldAlert className="size-5 text-[#8f5d17]" />
          <div>
            <AlertTitle className="text-sm font-bold text-[#6e4715]">
              Attribution & Boundary Notice
            </AlertTitle>
            <AlertDescription className="text-xs text-[#6e4715]/90 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                All AI responses ground solely on cited meteorological and satellite observations. Official severe weather warnings are issued exclusively by{" "}
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

        {/* Full-width Copilot Chat */}
        <CopilotChat districtId={districtId} districtName={currentDistrict.name} />
      </div>
    </AppShell>
  );
}
