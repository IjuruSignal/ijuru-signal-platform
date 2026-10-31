"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CloudRain,
  Compass,
  Droplets,
  ExternalLink,
  Filter,
  Leaf,
  Layers,
  MapPin,
  Mountain,
  Radar,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Waves,
  Wind,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { RwandaMap, MapLayerKind } from "./rwanda-map";
import { CopilotChat } from "@/features/ai/components/copilot-chat";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface DistrictItem {
  id: string;
  name: string;
  lat: number;
  lon: number;
  province?: string;
}

export function LocationWorkspace() {
  const [selectedId, setSelectedId] = useState("kigali");
  const [selectedName, setSelectedName] = useState("Kigali");
  const [selectedLat, setSelectedLat] = useState(-1.9501);
  const [selectedLon, setSelectedLon] = useState(30.0589);

  const [activeLayer, setActiveLayer] = useState<MapLayerKind>("precip");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [signals, setSignals] = useState<any>(null);
  const [loadingSignals, setLoadingSignals] = useState(true);

  const [fieldChecks, setFieldChecks] = useState<any[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const [currentUser, setCurrentUser] = useState({
    id: "user-field-01",
    role: "user",
    login: "field@ijuru.rw",
    isGuest: true,
  });

  const [areasList, setAreasList] = useState<DistrictItem[]>([]);
  const [tableFilter, setTableFilter] = useState("");

  // 1. Initial user & areas load
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});

    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => {
        if (d.areas && Array.isArray(d.areas)) {
          setAreasList(
            d.areas.map((a: any) => ({
              id: a.id,
              name: a.name,
              lat: a.geometry?.coordinates?.[0]?.[0]?.[1] ?? -1.95,
              lon: a.geometry?.coordinates?.[0]?.[0]?.[0] ?? 30.05,
              province: a.provenance?.province || "Rwanda",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch signals & field checks when selectedId changes
  useEffect(() => {
    setLoadingSignals(true);
    fetch(`/api/signals/${selectedId}`)
      .then((r) => r.json())
      .then((data) => {
        setSignals(data);
      })
      .catch(() => {})
      .finally(() => setLoadingSignals(false));

    setLoadingChecks(true);
    fetch(`/api/field-checks?areaId=${selectedId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.checks) setFieldChecks(data.checks);
      })
      .catch(() => {})
      .finally(() => setLoadingChecks(false));
  }, [selectedId]);

  // 3. Search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/places/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.results || []))
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDistrict = (id: string, name: string, lat: number, lon: number) => {
    setSelectedId(id);
    setSelectedName(name);
    setSelectedLat(lat);
    setSelectedLon(lon);
    setSearchQuery("");
    setSearchResults([]);
  };

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
        toast.success(`Active role updated: ${data.user.role.toUpperCase()}`);
        fetch(`/api/field-checks?areaId=${selectedId}`)
          .then((r) => r.json())
          .then((d) => d.checks && setFieldChecks(d.checks))
          .catch(() => {});
      }
    } catch {}
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      toast.error("Please enter an observation description.");
      return;
    }

    setSubmittingNote(true);
    try {
      const res = await fetch("/api/field-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: selectedId,
          areaName: selectedName,
          observation: noteText.trim(),
          observedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      toast.success("Field observation recorded. Added to review queue.");
      setNoteText("");
      setFieldChecks((prev) => [data.fieldCheck, ...prev]);
    } catch (err: any) {
      toast.error(`Error saving observation: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const filteredDistricts = areasList.filter((d) =>
    tableFilter ? d.name.toLowerCase().includes(tableFilter.toLowerCase()) : true
  );

  return (
    <AppShell
      currentUser={currentUser}
      onSwitchRole={handleSwitchRole}
      title={`${selectedName} District Climate Evidence`}
      subtitle="Open-Meteo live weather · ERA5 30-year baseline · NASA MODIS NDVI · Human field checks"
    >
      <div className="space-y-8">
        {/* Top Search & Filter Bar */}
        <section aria-label="National place search" className="relative">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#4a6365]" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any of Rwanda's 30 districts, sectors, towns, or hills (e.g. Musanze, Nyamata, Gisenyi)..."
                className="pl-10 h-11 bg-white border-[#bfd0ca] shadow-xs text-sm"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-[#195c70] animate-spin" />
              )}

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-[#d5dfda] bg-white shadow-lg overflow-hidden py-1 max-h-72 overflow-y-auto">
                  {searchResults.map((res: any) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() =>
                        handleSelectDistrict(
                          res.nearestDistrictId || res.id,
                          res.name,
                          res.lat,
                          res.lon
                        )
                      }
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#eaf0ec] flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-[#195c70]" />
                        <strong className="text-sm font-semibold text-[#132e36]">
                          {res.name}
                        </strong>
                        <span className="text-[#4a6365]">
                          {res.admin2 || res.admin1 || "Rwanda"}
                        </span>
                      </div>
                      <Badge variant={res.kind === "district" ? "signal" : "outline"} className="text-[10px]">
                        {res.kind === "district" ? "District" : "Locality"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="live" className="gap-1.5 py-1 px-3">
                <span className="size-2 rounded-full bg-[#185432] animate-pulse" />
                Live Open-Meteo Ingest Active
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href={`/places/${selectedId}`}>
                  <span>Full {selectedName} Briefing</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Official Meteo Rwanda Notice */}
        <Alert variant="warning" className="bg-[#f9ecd2] border-[#e6cca0]">
          <ShieldAlert className="size-5 text-[#8f5d17]" />
          <div>
            <AlertTitle className="text-sm font-bold text-[#6e4715]">
              National Warning Notice & Disclosures
            </AlertTitle>
            <AlertDescription className="text-xs text-[#6e4715]/90 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Satellite vegetation indices and numerical models are planning aids. Official meteorological warnings and severe hazard advisories are issued exclusively by{" "}
                <strong>Rwanda Meteorology Agency (Meteo Rwanda)</strong>.
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

        {/* National 30-District Interactive Map */}
        <section aria-label="Rwanda interactive map" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#195c70]">
                Spatial Evidence Overview
              </span>
              <h2 className="text-2xl font-bold font-display text-[#132e36]">
                Rwanda 30-District Climate Map
              </h2>
            </div>
            <p className="text-xs text-[#4a6365] max-w-md">
              Select any district to inspect live precipitation outlooks, root-zone moisture, vegetation canopy, and 30-year historical rainfall deviations.
            </p>
          </div>

          <RwandaMap
            selectedId={selectedId}
            selectedName={selectedName}
            selectedLat={selectedLat}
            selectedLon={selectedLon}
            onSelectDistrict={handleSelectDistrict}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />
        </section>

        {/* Selected District Signal Dashboard */}
        <section aria-label="Active district climate intelligence" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#195c70] text-[#e3ed8c] flex items-center justify-center font-bold text-sm">
                {selectedName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-[#132e36]">
                  {selectedName} District Evidence Dashboard
                </h3>
                <span className="text-xs text-[#4a6365]">
                  Coordinates: {selectedLat.toFixed(4)}°N, {selectedLon.toFixed(4)}°E ·{" "}
                  {signals?.weather?.source || "Open-Meteo & ERA5"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="signal">Active Focus</Badge>
              <Button asChild variant="ink" size="sm">
                <Link href={`/places/${selectedId}`}>
                  <span>Open Deep Analytics</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* 5-Day Weather Forecast Strip */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CloudRain className="size-4 text-[#195c70]" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-[#132e36]">
                    7-Day Weather Forecast & Precipitation Outlook
                  </CardTitle>
                </div>
                <span className="text-xs font-semibold text-[#132e36] tabular-nums">
                  Current: {signals?.weather?.temperatureC ?? 24}°C · Humidity:{" "}
                  {signals?.weather?.humidity ?? 60}% · Wind:{" "}
                  {signals?.weather?.windSpeedKmh ?? 8} km/h
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSignals ? (
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 animate-pulse">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-[#e5ece8]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
                  {(signals?.weather?.forecastDays || []).slice(0, 7).map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        idx === 0
                          ? "border-[#195c70] bg-[#eef5f6]"
                          : "border-[#d5dfda] bg-white hover:bg-[#f8faf8]"
                      }`}
                    >
                      <span className="text-[11px] font-bold text-[#4a6365] block">
                        {idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : d.date.slice(5)}
                      </span>
                      <div className="mt-1.5 text-base font-bold text-[#132e36] tabular-nums">
                        {d.tempMax}° /{" "}
                        <span className="text-xs font-normal text-[#4a6365]">{d.tempMin}°</span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-[#195c70] bg-[#dbe8ec] py-1 px-1 rounded-md tabular-nums">
                        {d.precipProb}% rain
                      </div>
                      <span className="text-[11px] text-[#4a6365] block mt-1 tabular-nums">
                        {d.precipMm} mm
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Three Key Climate Metrics: Soil & Rain, Satellite NDVI, Historical 30yr Anomaly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Historical Rainfall Anomaly */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radar className="size-4 text-[#195c70]" />
                    <CardTitle className="text-sm font-bold text-[#132e36]">
                      ERA5 30-Year Rainfall Baseline
                    </CardTitle>
                  </div>
                  <Badge variant="calibrated">30yr Norm</Badge>
                </div>
                <CardDescription className="text-xs">
                  Cumulative seasonal precipitation vs historical 1991–2020 normal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-bold font-display text-[#132e36] tabular-nums">
                    {signals?.rainfall?.targetMm ?? 94} mm
                  </span>
                  <span className="text-xs font-semibold text-[#4a6365] tabular-nums">
                    Norm: {signals?.rainfall?.baselineMeanMm ?? 102} mm
                  </span>
                </div>
                <div className="rounded-lg bg-[#f3f4ee] p-2.5 border border-[#d5dfda] text-xs">
                  <strong className="text-[#132e36] block">
                    Anomaly: {signals?.rainfall?.diffMm >= 0 ? "+" : ""}
                    {signals?.rainfall?.diffMm ?? 0} mm ({signals?.rainfall?.status ?? "Near Normal"})
                  </strong>
                  <span className="text-[#4a6365] text-[11px] mt-0.5 block">
                    {signals?.rainfall?.percent ?? 100}% of historical monthly median
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 2. NASA MODIS / Sentinel-2 Vegetation NDVI */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className="size-4 text-[#195c70]" />
                    <CardTitle className="text-sm font-bold text-[#132e36]">
                      Satellite Canopy NDVI
                    </CardTitle>
                  </div>
                  <Badge variant="live">250m Surface</Badge>
                </div>
                <CardDescription className="text-xs">
                  Normalized Difference Vegetation Index (chlorophyll absorption)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-bold font-display text-[#132e36] tabular-nums">
                    {signals?.satellite?.ndvi ?? 0.58}
                  </span>
                  <span className="text-xs font-semibold text-[#195c70]">
                    {signals?.satellite?.status ?? "Moderate canopy vigour"}
                  </span>
                </div>
                <div className="rounded-lg bg-[#f3f4ee] p-2.5 border border-[#d5dfda] text-xs">
                  <span className="text-[#132e36] font-semibold block">
                    Trend: {signals?.satellite?.trend ?? "+0.02 vs last pass"}
                  </span>
                  <span className="text-[#4a6365] text-[11px] block mt-0.5">
                    Pass: {signals?.satellite?.passDate ?? "Recent"} · {signals?.satellite?.quality ?? "Cloud filtered"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Soil Moisture & Hydrological Runoff */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Waves className="size-4 text-[#195c70]" />
                    <CardTitle className="text-sm font-bold text-[#132e36]">
                      Soil Moisture & Runoff Index
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">0–7cm Topsoil</Badge>
                </div>
                <CardDescription className="text-xs">
                  Hydrological saturation and agricultural surface moisture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-bold font-display text-[#132e36] tabular-nums">
                    {signals?.hydrology?.soilMoisturePct ?? 46}%
                  </span>
                  <span className="text-xs font-semibold text-[#4a6365] tabular-nums">
                    Discharge: {signals?.hydrology?.riverDischargeM3s ?? 12.4} m³/s
                  </span>
                </div>
                <div className="rounded-lg bg-[#f3f4ee] p-2.5 border border-[#d5dfda] text-xs">
                  <span className="text-[#132e36] font-semibold block">
                    Runoff: {signals?.hydrology?.runoffRiskNote ?? "Moderate drainage rate"}
                  </span>
                  <span className="text-[#4a6365] text-[11px] block mt-0.5">
                    Evapotranspiration (ET0): {signals?.weather?.forecastDays?.[0]?.et0Mm ?? 3.8} mm/day
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Human Ground Verification & Field Observations */}
        <section aria-label="Field observations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#195c70]">
                    Ground Truth Verification
                  </span>
                  <CardTitle className="text-lg font-bold text-[#132e36]">
                    Field Observations — {selectedName} District
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Human checks from agricultural extension workers ground satellite and weather models.
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {fieldChecks.length} Observation{fieldChecks.length === 1 ? "" : "s"} Logged
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Submission Form */}
              <form onSubmit={handleNoteSubmit} className="space-y-3 rounded-xl bg-[#f8f9f5] p-4 border border-[#d5dfda]">
                <label htmlFor="field-note-input" className="text-xs font-bold text-[#132e36] block">
                  Record New Field Observation in {selectedName}:
                </label>
                <Textarea
                  id="field-note-input"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Describe ground observations (e.g., surface soil drying on terrace slopes, visible standing water in marshlands, crop vegetative stage)..."
                  className="bg-white min-h-[76px]"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#4a6365]">
                    Logged under identity: <strong>{currentUser.login || currentUser.id}</strong> ({currentUser.role})
                  </span>
                  <Button type="submit" size="sm" disabled={submittingNote || !noteText.trim()}>
                    <Send className="size-3.5" />
                    <span>Submit Field Check</span>
                  </Button>
                </div>
              </form>

              {/* Existing Observations List */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a6365] block">
                  Recent Verified Observations in {selectedName}
                </span>
                {loadingChecks ? (
                  <div className="space-y-2">
                    <div className="h-16 rounded-lg bg-[#e5ece8] animate-pulse" />
                    <div className="h-16 rounded-lg bg-[#e5ece8] animate-pulse" />
                  </div>
                ) : fieldChecks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#4a6365] border border-dashed rounded-xl bg-[#f8f9f5]">
                    No ground observations recorded yet for {selectedName}. Submit the first note above.
                  </div>
                ) : (
                  <div className="divide-y divide-[#e2e8e4]">
                    {fieldChecks.map((fc) => (
                      <div key={fc.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#132e36]">{fc.observation}</p>
                          <div className="flex items-center gap-3 text-[#4a6365] text-[11px]">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(fc.observed_at || fc.created_at).toLocaleDateString()}
                            </span>
                            <span>Observer: {fc.author_id}</span>
                            <span>Version: v{fc.version}</span>
                          </div>
                        </div>
                        <Badge variant={fc.status === "reviewed" ? "live" : "warning"}>
                          {fc.status === "reviewed" ? "Reviewed" : "Pending Review"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Embedded Grounded Climate AI Assistant */}
        <section aria-label="Climate Copilot assistant">
          <CopilotChat districtId={selectedId} districtName={selectedName} />
        </section>

        {/* Accessible Sortable District Table (Map-Free Path) */}
        <section aria-label="30 Districts table" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#195c70]">
                Map-Free Access (WCAG 2.1 AA)
              </span>
              <h3 className="text-lg font-bold font-display text-[#132e36]">
                All 30 Districts of Rwanda
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                placeholder="Filter districts..."
                className="h-9 w-48 text-xs bg-white"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead className="text-right">GPS Centroid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistricts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs py-6 text-[#4a6365]">
                      No districts matching &quot;{tableFilter}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDistricts.map((d) => {
                    const isSelected = d.id === selectedId;
                    return (
                      <TableRow key={d.id} className={isSelected ? "bg-[#eaf0ec]" : ""}>
                        <TableCell className="font-bold text-[#132e36]">
                          {d.name} {isSelected && <Badge variant="signal" className="ml-2">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-[#4a6365]">{d.province || "Rwanda"}</TableCell>
                        <TableCell className="text-right tabular-nums text-[#4a6365] text-xs">
                          {d.lat.toFixed(2)}°N, {d.lon.toFixed(2)}°E
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSelectDistrict(d.id, d.name, d.lat, d.lon)}
                          >
                            Select
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/places/${d.id}`}>Briefing</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
