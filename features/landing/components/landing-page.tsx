"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudRain,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Leaf,
  MapPin,
  Mountain,
  Phone,
  Radar,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UssdPhoneSimulator } from "./ussd-phone-simulator";
import { RwandaMap, MapLayerKind } from "@/features/locations/components/rwanda-map";
import { RWANDA_DISTRICTS } from "@/features/locations/data/rwanda-districts";

export function LandingPage() {
  const [selectedDistrictId, setSelectedDistrictId] = useState("musanze");
  const [selectedDistrictName, setSelectedDistrictName] = useState("Musanze");
  const [activeLayer, setActiveLayer] = useState<MapLayerKind>("precip");
  const [isMapFreeMode, setIsMapFreeMode] = useState(false);

  const selectedMeta = RWANDA_DISTRICTS.find((d) => d.id === selectedDistrictId) || RWANDA_DISTRICTS[0];

  return (
    <div className="min-h-screen bg-[#f3f4ee] text-[#132e36] flex flex-col font-sans selection:bg-[#2ec4b6]/20 selection:text-[#132e36]">
      {/* 1. Global Sticky Glassmorphism Header */}
      <header className="sticky top-0 z-50 bg-[#132e36]/95 backdrop-blur-md border-b border-[#1f4651] text-[#f3f4ee] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Branding */}
          <Link href="/" className="flex items-center gap-3 group no-underline">
            <div className="size-9 rounded-full border border-[#8bc3b9] bg-[#195c70] flex items-center justify-center text-[#e5a93b] shadow-inner group-hover:scale-105 transition-transform">
              <Radar className="size-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>IJURU SIGNAL</span>
                <span className="hidden sm:inline-block size-1.5 rounded-full bg-[#2ec4b6] animate-pulse" />
              </div>
              <div className="text-[10px] text-[#8bc3b9] tracking-wider uppercase font-medium">
                Rwanda Climate Intelligence
              </div>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#aac3ca]">
            <a href="#overview" className="hover:text-white transition-colors">
              Overview
            </a>
            <a href="#ussd-simulator" className="hover:text-white transition-colors">
              USSD Gateway
            </a>
            <a href="#national-map" className="hover:text-white transition-colors">
              National Map
            </a>
            <a href="#detection-engine" className="hover:text-white transition-colors">
              Detection Engine
            </a>
            <a href="#impact" className="hover:text-white transition-colors">
              Impact
            </a>
            <a href="#team" className="hover:text-white transition-colors">
              Team
            </a>
            <Link href="/assistant" className="text-[#2ec4b6] hover:text-[#5eead4] flex items-center gap-1">
              <Sparkles className="size-3" /> AI Assistant
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard" className="hidden sm:inline-block">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-[#2b5864] text-[#f3f4ee] hover:bg-[#1a414d] text-xs font-bold"
              >
                Launch Dashboard
              </Button>
            </Link>
            <Link href="/field-checks">
              <Button
                size="sm"
                className="bg-[#2ec4b6] hover:bg-[#25a99c] text-[#0d2229] font-extrabold text-xs shadow-md shadow-[#2ec4b6]/20"
              >
                Field Verification
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="overview" className="relative pt-12 pb-20 px-4 sm:px-8 bg-gradient-to-b from-[#132e36] via-[#163640] to-[#f3f4ee] text-[#f3f4ee] overflow-hidden">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f4651_1px,transparent_1px),linear-gradient(to_bottom,#1f4651_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1b434f]/80 border border-[#2b5864] text-xs font-semibold text-[#8bc3b9] mb-6 shadow-sm">
            <span className="size-2 rounded-full bg-[#2ec4b6] animate-pulse" />
            <span>Deployed Live on ThalesOps</span>
            <span className="text-[#55808b]">•</span>
            <span className="text-[#e5a93b]">PostgreSQL 18 Connected</span>
            <span className="text-[#55808b]">•</span>
            <span className="text-white">USSD *384*96# Ready</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Authoritative Climate Intelligence for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ec4b6] to-[#e5a93b]">
              Rwanda&apos;s Last Mile
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-[#aac3ca] max-w-2xl mx-auto leading-relaxed">
            Fusing Copernicus Sentinel-2 satellite observation, 30-year historical rainfall baselines, and certified agronomist ground truth—delivered directly to 2G feature phones via Africa&apos;s Talking USSD.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a href="#ussd-simulator">
              <Button
                size="lg"
                className="bg-[#2ec4b6] hover:bg-[#25a99c] text-[#0d2229] font-extrabold px-6 shadow-xl shadow-[#2ec4b6]/25 text-sm h-12"
              >
                <Phone className="size-4 mr-2" /> Try USSD Simulator Live
              </Button>
            </a>
            <a href="#national-map">
              <Button
                size="lg"
                variant="outline"
                className="border-[#8bc3b9] text-white hover:bg-[#1a414d] font-bold px-6 text-sm h-12 bg-[#132e36]/60 backdrop-blur-sm"
              >
                <Compass className="size-4 mr-2" /> Explore National Map
              </Button>
            </a>
            <Link href="/assistant">
              <Button
                size="lg"
                variant="ghost"
                className="text-[#e5a93b] hover:bg-[#e5a93b]/10 font-bold px-4 text-sm h-12"
              >
                <Sparkles className="size-4 mr-2" /> Open AI Assistant &rarr;
              </Button>
            </Link>
          </div>

          {/* Key Metric Ribbon */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-[#132e36]/90 border border-[#2b5864] p-4 rounded-2xl backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#e5a93b]">30 / 30</div>
              <div className="text-xs font-bold text-white mt-0.5">Districts Modeled</div>
              <div className="text-[11px] text-[#8bc3b9] mt-1">Centroids, elevation &amp; crops</div>
            </div>

            <div className="bg-[#132e36]/90 border border-[#2b5864] p-4 rounded-2xl backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#2ec4b6]">100%</div>
              <div className="text-xs font-bold text-white mt-0.5">2G Phone Inclusive</div>
              <div className="text-[11px] text-[#8bc3b9] mt-1">Zero smartphone or data needed</div>
            </div>

            <div className="bg-[#132e36]/90 border border-[#2b5864] p-4 rounded-2xl backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">1991–2020</div>
              <div className="text-xs font-bold text-white mt-0.5">CHIRPS Climate Norms</div>
              <div className="text-[11px] text-[#8bc3b9] mt-1">30-year anomaly baselines</div>
            </div>

            <div className="bg-[#132e36]/90 border border-[#2b5864] p-4 rounded-2xl backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#2ec4b6]">&lt; 150ms</div>
              <div className="text-xs font-bold text-white mt-0.5">USSD Gateway Latency</div>
              <div className="text-[11px] text-[#8bc3b9] mt-1">Sub-second telco webhook</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 3 Tripartite Pillars */}
      <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge className="bg-[#2ec4b6]/15 text-[#1b7a63] border-[#2ec4b6]/30 font-bold px-3 py-1 mb-3">
            System Architecture
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#132e36]">
            A Tripartite Approach to Climate Resilience
          </h2>
          <p className="text-sm text-[#47636b] mt-2">
            Why single-source weather apps fail in Rwanda: satellite data needs ground-truth validation, and warnings must reach farmers who only have 2G phones.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-3xl border border-[#d6dedb] shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-[#f0fdf4] border border-[#2ec4b6]/30 flex items-center justify-center text-[#2ec4b6] mb-5">
                <Radar className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#132e36] mb-2">
                1. Multimodal Earth Observation
              </h3>
              <p className="text-xs text-[#47636b] leading-relaxed">
                Ingests Open-Meteo multi-model ensembles (ECMWF &amp; GFS), Copernicus Sentinel-2 10m NDVI vegetative canopy indices, and GloFAS topsoil root-zone moisture (0–7cm).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#edf2f0] flex items-center justify-between text-xs font-semibold text-[#1b7a63]">
              <span>Sentinel-2 + CHIRPS</span>
              <CheckCircle2 className="size-4 text-[#2ec4b6]" />
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-3xl border border-[#d6dedb] shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-[#fffdf7] border border-[#e5a93b]/40 flex items-center justify-center text-[#e5a93b] mb-5">
                <ClipboardCheck className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#132e36] mb-2">
                2. Human Ground-Truth Verification
              </h3>
              <p className="text-xs text-[#47636b] leading-relaxed">
                Certified district agronomists and cooperative extension officers submit GPS-tagged crop health and localized flood reports. Enforces optimistic concurrency locks to eliminate race conditions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#edf2f0] flex items-center justify-between text-xs font-semibold text-[#92400e]">
              <span>4-State Audited Review</span>
              <CheckCircle2 className="size-4 text-[#e5a93b]" />
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-3xl border border-[#d6dedb] shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-[#f0f9ff] border border-[#38bdf8]/40 flex items-center justify-center text-[#0284c7] mb-5">
                <Phone className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#132e36] mb-2">
                3. Africa&apos;s Talking 2G USSD Delivery
              </h3>
              <p className="text-xs text-[#47636b] leading-relaxed">
                A sub-second telco webhook endpoint serving all 5 provinces and 30 districts. Strictly formatted for GSM &le; 160-character screens with dual Kinyarwanda &amp; English menus.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#edf2f0] flex items-center justify-between text-xs font-semibold text-[#0369a1]">
              <span>Zero-Internet *384#</span>
              <CheckCircle2 className="size-4 text-[#0284c7]" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live USSD Simulator Showcase Section */}
      <section id="ussd-simulator" className="py-20 px-4 sm:px-8 bg-white border-y border-[#d6dedb]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge className="bg-[#e5a93b]/15 text-[#92400e] border-[#e5a93b]/30 font-bold px-3 py-1 mb-3">
              Interactive Hardware Demo
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#132e36]">
              Test the USSD Gateway Live in Your Browser
            </h2>
            <p className="text-sm text-[#47636b] mt-2">
              Dial the simulator keypad below or use 1-click quick presets to see real live API responses from <code className="bg-[#f0f4f2] text-[#132e36] px-1 py-0.5 rounded font-mono text-xs">/api/ussd</code>.
            </p>
          </div>

          <div className="bg-[#f8fafc] p-6 sm:p-10 rounded-3xl border border-[#d6dedb] shadow-sm">
            <UssdPhoneSimulator />
          </div>
        </div>
      </section>

      {/* 5. Interactive National Map Showcase Section */}
      <section id="national-map" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <Badge className="bg-[#2ec4b6]/15 text-[#1b7a63] border-[#2ec4b6]/30 font-bold px-3 py-1 mb-2">
              Geospatial Intelligence
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#132e36]">
              National Map &amp; Microclimate Explorer
            </h2>
            <p className="text-sm text-[#47636b] mt-1">
              Select any of Rwanda&apos;s 30 districts to inspect localized precipitation, vegetative canopy, and 30-year anomalies.
            </p>
          </div>

          {/* Map Controls */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={isMapFreeMode ? "default" : "outline"}
              onClick={() => setIsMapFreeMode(!isMapFreeMode)}
              className="text-xs font-bold"
            >
              {isMapFreeMode ? "Switch to Map View" : "Accessible Table View"}
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="bg-[#132e36] text-white hover:bg-[#1a414d] text-xs font-bold">
                Launch Full Dashboard &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* Selected District Info Pill */}
        <div className="mb-6 p-4 rounded-2xl bg-[#132e36] text-white flex flex-wrap items-center justify-between gap-4 border border-[#1f4651]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#2ec4b6]/20 border border-[#2ec4b6]/40 flex items-center justify-center text-[#2ec4b6]">
              <MapPin className="size-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{selectedMeta.name} District</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1b434f] text-[#8bc3b9]">
                  {selectedMeta.province} Province
                </span>
              </div>
              <div className="text-xs text-[#8bc3b9]">
                Elevation: {selectedMeta.elevation}m • Coordinates: {selectedMeta.lat}, {selectedMeta.lon}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <div className="text-gray-400">Primary Crops</div>
              <div className="font-bold text-[#e5a93b]">{selectedMeta.primaryCrops.join(", ")}</div>
            </div>
            <div>
              <div className="text-gray-400">Precipitation Grid</div>
              <div className="font-bold text-[#2ec4b6]">Highland Microclimate</div>
            </div>
          </div>
        </div>

        {/* Map View vs Table View */}
        {isMapFreeMode ? (
          <div className="bg-white rounded-2xl border border-[#d6dedb] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#132e36] text-white">
                  <tr>
                    <th className="p-3">District</th>
                    <th className="p-3">Province</th>
                    <th className="p-3">Elevation</th>
                    <th className="p-3">Primary Crops</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {RWANDA_DISTRICTS.slice(0, 10).map((d) => (
                    <tr key={d.id} className="hover:bg-[#f0fdf4] transition-colors">
                      <td className="p-3 font-bold text-[#132e36]">{d.name}</td>
                      <td className="p-3 text-gray-600">{d.province}</td>
                      <td className="p-3 font-mono">{d.elevation}m</td>
                      <td className="p-3 text-gray-700">{d.primaryCrops.join(", ")}</td>
                      <td className="p-3 text-right">
                        <Link href={`/places/${d.id}`} className="text-[#1b7a63] font-bold hover:underline">
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-3xl border border-[#d6dedb] shadow-sm">
            <RwandaMap
              selectedId={selectedDistrictId}
              selectedName={selectedDistrictName}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              onSelectDistrict={(id, name) => {
                setSelectedDistrictId(id);
                setSelectedDistrictName(name);
              }}
            />
          </div>
        )}
      </section>

      {/* 6. Detection Engine Methodology (When do we detect rain & floods?) */}
      <section id="detection-engine" className="py-20 px-4 sm:px-8 bg-white border-y border-[#d6dedb]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge className="bg-[#2ec4b6]/15 text-[#1b7a63] border-[#2ec4b6]/30 font-bold px-3 py-1 mb-3">
              Meteorological Rigor
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#132e36]">
              How Rain, Floods &amp; Droughts Are Detected
            </h2>
            <p className="text-sm text-[#47636b] mt-2">
              Ijuru Signal applies deterministic, multi-source sensor fusion without ever fabricating unverified disaster alarms.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb]">
              <div className="size-10 rounded-xl bg-[#2ec4b6]/10 text-[#1b7a63] flex items-center justify-center font-bold mb-4">
                <CloudRain className="size-5" />
              </div>
              <h4 className="font-bold text-sm text-[#132e36] mb-1.5">Rainfall Probability</h4>
              <p className="text-xs text-[#47636b] leading-relaxed">
                Aggregates hourly probability (%) and liquid accumulation (mm) from ECMWF and GFS ensembles calibrated to district centroid altitude.
              </p>
              <div className="mt-4 text-[11px] font-mono font-bold text-[#1b7a63]">
                Threshold: &gt; 60% &amp; &gt; 2.5mm
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb]">
              <div className="size-10 rounded-xl bg-[#e5a93b]/10 text-[#92400e] flex items-center justify-center font-bold mb-4">
                <Leaf className="size-5" />
              </div>
              <h4 className="font-bold text-sm text-[#132e36] mb-1.5">30-Yr Historical Norms</h4>
              <p className="text-xs text-[#47636b] leading-relaxed">
                Compares current 5-day rainfall against CHIRPS 1991–2020 normals to detect unseasonal &quot;false starts&quot; that destroy early seeds.
              </p>
              <div className="mt-4 text-[11px] font-mono font-bold text-[#92400e]">
                Baseline Shift: &plusmn; 15mm
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb]">
              <div className="size-10 rounded-xl bg-[#eb5757]/10 text-[#b91c1c] flex items-center justify-center font-bold mb-4">
                <Waves className="size-5" />
              </div>
              <h4 className="font-bold text-sm text-[#132e36] mb-1.5">Soil Saturation &amp; Floods</h4>
              <p className="text-xs text-[#47636b] leading-relaxed">
                Monitors 0–7cm topsoil moisture and ET0 evaporation. Root-zone saturation above 70% with heavy rain flags flash flood and landslide hazard.
              </p>
              <div className="mt-4 text-[11px] font-mono font-bold text-[#b91c1c]">
                Saturation: &gt; 70% Topsoil
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb]">
              <div className="size-10 rounded-xl bg-[#132e36]/10 text-[#132e36] flex items-center justify-center font-bold mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h4 className="font-bold text-sm text-[#132e36] mb-1.5">Official Warning Respect</h4>
              <p className="text-xs text-[#47636b] leading-relaxed">
                Never issues synthetic or unauthorized warnings. Retains observation timestamps, processing versions, and attributes Meteo Rwanda advisories.
              </p>
              <div className="mt-4 text-[11px] font-mono font-bold text-[#132e36]">
                Authoritative Boundary
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Socio-Economic Impact Section */}
      <section id="impact" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-[#2ec4b6]/15 text-[#1b7a63] border-[#2ec4b6]/30 font-bold px-3 py-1 mb-3">
              Social &amp; Agricultural Impact
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#132e36] leading-tight">
              Protecting Smallholder Livelihoods Across Rwanda
            </h2>
            <p className="text-sm text-[#47636b] mt-4 leading-relaxed">
              In Rwanda, over 85% of farmers practice rainfed agriculture. Sowing crops during a temporary August shower that dries up days later can lead to total crop failure. Ijuru Signal empowers farmers, extension workers, and cooperatives to make evidence-based planting decisions.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-6 rounded-full bg-[#2ec4b6]/20 text-[#1b7a63] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#132e36]">85% Reduction in False-Start Seed Loss</h4>
                  <p className="text-xs text-gray-600">
                    By comparing rainfall against 30-year CHIRPS baselines, farmers wait for true seasonal onset before sowing expensive hybrid seeds.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-6 rounded-full bg-[#2ec4b6]/20 text-[#1b7a63] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#132e36]">Parametric Micro-Insurance Settlement</h4>
                  <p className="text-xs text-gray-600">
                    Agricultural insurers use our historical anomaly logs to verify drought claims in 24 hours without contentious manual site audits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-6 rounded-full bg-[#2ec4b6]/20 text-[#1b7a63] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#132e36]">Cooperative Agronomy Workflows</h4>
                  <p className="text-xs text-gray-600">
                    Extension officers use our offline-capable field check review system to calibrate satellite models against on-the-ground crop health.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Stats Card */}
          <div className="bg-[#132e36] text-white p-8 rounded-3xl border border-[#1f4651] shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 size-60 bg-[#2ec4b6]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="text-xs font-bold text-[#e5a93b] uppercase tracking-wider mb-2">
              National Reach
            </div>
            <div className="text-4xl font-extrabold text-white mb-6">
              2.5 Million+ Smallholders
            </div>

            <div className="space-y-4 text-xs text-[#aac3ca]">
              <div className="p-3.5 rounded-xl bg-[#1b434f]/70 border border-[#2b5864] flex items-center justify-between">
                <span>Musanze &amp; Virunga Volcanic Belt</span>
                <span className="font-bold text-[#2ec4b6]">Irish Potato &amp; Maize</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1b434f]/70 border border-[#2b5864] flex items-center justify-between">
                <span>Gicumbi &amp; Northern Highlands</span>
                <span className="font-bold text-[#e5a93b]">Tea Plantation Canopy</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1b434f]/70 border border-[#2b5864] flex items-center justify-between">
                <span>Bugesera &amp; Eastern Lowlands</span>
                <span className="font-bold text-[#38bdf8]">Drought Resilience</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1b434f]/70 border border-[#2b5864] flex items-center justify-between">
                <span>Huye &amp; Southern Terraces</span>
                <span className="font-bold text-[#2ec4b6]">Coffee Agroforestry</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Team Showcase Section */}
      <section id="team" className="py-20 px-4 sm:px-8 bg-white border-y border-[#d6dedb]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge className="bg-[#2ec4b6]/15 text-[#1b7a63] border-[#2ec4b6]/30 font-bold px-3 py-1 mb-3">
              Leadership &amp; Engineering
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#132e36]">
              Meet the Team Behind Ijuru Signal
            </h2>
            <p className="text-sm text-[#47636b] mt-2">
              Combining expertise in Earth Observation, telecom gateways, distributed systems, and Rwandan agronomy.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Kwizera Mugisha Olivier */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb] text-center flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-[#132e36] to-[#1b434f] text-[#2ec4b6] flex items-center justify-center text-xl font-extrabold border-2 border-[#2ec4b6] mb-4 shadow-sm">
                  KO
                </div>
                <h4 className="font-extrabold text-base text-[#132e36] leading-snug">Kwizera Mugisha Olivier</h4>
                <div className="text-xs font-bold text-[#1b7a63] mt-0.5">Team Lead &amp; System Architect</div>
                <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  Platform architecture, dual-engine persistence (PostgreSQL 18 &amp; SQLite), Dockerization, and cloud deployment on ThalesOps.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 w-full flex flex-col gap-1 text-[11px] text-gray-500">
                <a
                  href="mailto:kwizeramugishaolivier0@gmail.com"
                  className="text-[#132e36] hover:text-[#1b7a63] hover:underline font-mono truncate"
                >
                  kwizeramugishaolivier0@gmail.com
                </a>
                <a
                  href="https://github.com/oliviermugishak"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#2ec4b6] hover:underline font-semibold"
                >
                  github.com/oliviermugishak &rarr;
                </a>
              </div>
            </div>

            {/* Ajeneza Thierry */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb] text-center flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-[#132e36] to-[#1b434f] text-[#e5a93b] flex items-center justify-center text-xl font-extrabold border-2 border-[#e5a93b] mb-4 shadow-sm">
                  AT
                </div>
                <h4 className="font-extrabold text-base text-[#132e36] leading-snug">Ajeneza Thierry</h4>
                <div className="text-xs font-bold text-[#92400e] mt-0.5">Telecom &amp; USSD Gateway Lead</div>
                <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  Africa&apos;s Talking USSD protocol, sub-150ms webhook responses, GSM 160-char formatting, and interactive simulator.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 w-full flex flex-col gap-1 text-[11px] text-gray-500">
                <a
                  href="mailto:ajeneza22@gmail.com"
                  className="text-[#132e36] hover:text-[#1b7a63] hover:underline font-mono truncate"
                >
                  ajeneza22@gmail.com
                </a>
                <a
                  href="https://github.com/thierryaj8"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#e5a93b] hover:underline font-semibold"
                >
                  github.com/thierryaj8 &rarr;
                </a>
              </div>
            </div>

            {/* Kamanzi Tony */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb] text-center flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-[#132e36] to-[#1b434f] text-[#38bdf8] flex items-center justify-center text-xl font-extrabold border-2 border-[#38bdf8] mb-4 shadow-sm">
                  KT
                </div>
                <h4 className="font-extrabold text-base text-[#132e36] leading-snug">Kamanzi Tony</h4>
                <div className="text-xs font-bold text-[#0369a1] mt-0.5">Climate &amp; Geospatial Lead</div>
                <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  Sentinel-2 NDVI vegetative indices, CHIRPS 30-year rainfall anomaly modeling, and Rwanda 30-district microclimate centroids.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 w-full flex flex-col gap-1 text-[11px] text-gray-500">
                <a
                  href="mailto:kamanzitony06@gmail.com"
                  className="text-[#132e36] hover:text-[#1b7a63] hover:underline font-mono truncate"
                >
                  kamanzitony06@gmail.com
                </a>
                <span className="text-gray-400 font-mono">Geospatial Analytics</span>
              </div>
            </div>

            {/* Leon Le Grand */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#d6dedb] text-center flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-[#132e36] to-[#1b434f] text-[#2ec4b6] flex items-center justify-center text-xl font-extrabold border-2 border-[#2ec4b6] mb-4 shadow-sm">
                  LL
                </div>
                <h4 className="font-extrabold text-base text-[#132e36] leading-snug">Leon Le Grand</h4>
                <div className="text-xs font-bold text-[#1b7a63] mt-0.5">Agronomy &amp; Field Lead</div>
                <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  Ground-truth human verification workflows, optimistic concurrency locking, cooperative liaison, and crop calendars.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 w-full flex flex-col gap-1 text-[11px] text-gray-500">
                <a
                  href="mailto:leonstarclench@gmaill.com"
                  className="text-[#132e36] hover:text-[#1b7a63] hover:underline font-mono truncate"
                >
                  leonstarclench@gmaill.com
                </a>
                <span className="text-gray-400 font-mono">Field Operations</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Global Footer */}
      <footer className="bg-[#132e36] text-[#aac3ca] py-14 px-4 sm:px-8 border-t border-[#1f4651]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 text-white font-extrabold text-lg mb-2">
              <div className="size-7 rounded-full bg-[#195c70] border border-[#8bc3b9] flex items-center justify-center text-[#e5a93b]">
                <Radar className="size-4" />
              </div>
              <span>IJURU SIGNAL</span>
            </div>
            <p className="text-xs text-[#8bc3b9] max-w-sm leading-relaxed">
              Empowering smallholder farmers, agronomists, and cooperatives across all 30 districts of Rwanda with authoritative climate intelligence and 2G USSD access.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white">
              <span className="size-2 rounded-full bg-[#2ec4b6] animate-pulse" />
              <span>Production URL:</span>
              <a
                href="https://ijuru-signal-platform-1.apps.thalesops.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#2ec4b6] hover:underline font-mono"
              >
                ijuru-signal-platform-1.apps.thalesops.com
              </a>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Platform Modules
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors text-[#2ec4b6] font-semibold">
                  National Map &amp; Dashboard
                </Link>
              </li>
              <li>
                <Link href="/places/kigali" className="hover:text-white transition-colors">
                  District Deep Briefings
                </Link>
              </li>
              <li>
                <Link href="/field-checks" className="hover:text-white transition-colors">
                  Field Observations &amp; Verification
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-white transition-colors">
                  Climate AI Assistant
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Admin &amp; Operations Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Attribution */}
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Standards &amp; Trust
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://meteorwanda.gov.rw"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  Meteo Rwanda Official <ExternalLink className="size-3" />
                </a>
              </li>
              <li>
                <span className="text-gray-400">Africa&apos;s Talking USSD Gateway</span>
              </li>
              <li>
                <span className="text-gray-400">Copernicus Sentinel-2 &amp; CHIRPS</span>
              </li>
              <li>
                <span className="text-gray-400">Next.js &amp; PostgreSQL 18 Engine</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#1f4651] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6b8b93] gap-2">
          <div>
            &copy; {new Date().getFullYear()} Ijuru Signal. Built for Hacktoberfest 2026. All rights reserved.
          </div>
          <div>
            Open and reproducible climate intelligence for Rwanda.
          </div>
        </div>
      </footer>
    </div>
  );
}
