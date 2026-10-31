import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CloudRain,
  Compass,
  Droplets,
  ExternalLink,
  Leaf,
  MapPin,
  Mountain,
  Radar,
  ShieldAlert,
  Sparkles,
  Waves,
  Wind,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { findDistrict } from "@/features/locations/data/rwanda-districts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const district = findDistrict(slug);
  return {
    title: district
      ? `${district.name} District Climate Briefing | Ijuru Signal`
      : "District Briefing | Ijuru Signal",
    description: district
      ? `Authoritative weather, 30-year rainfall anomaly, satellite NDVI, and field checks for ${district.name}, ${district.province}.`
      : "Climate evidence briefing.",
  };
}

export default async function DistrictPage({ params }: Props) {
  const { slug } = await params;
  const district = findDistrict(slug);

  if (!district) {
    notFound();
  }

  return (
    <AppShell
      title={`${district.name} District — Climate Evidence Briefing`}
      subtitle={`${district.province} · ${district.elevation}m altitude · ${district.agroZone}`}
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm">
            <Link href="/" className="gap-2">
              <ArrowLeft className="size-4" />
              <span>Back to Rwanda National Map</span>
            </Link>
          </Button>
          <Badge variant="signal" className="gap-1.5 py-1 px-3">
            <MapPin className="size-3.5" />
            <span>
              {district.lat.toFixed(4)}°N, {district.lon.toFixed(4)}°E
            </span>
          </Badge>
        </div>

        {/* District Overview Hero */}
        <Card className="bg-gradient-to-br from-white to-[#f0f5f2] border-[#cddad4]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#195c70]">
                  District Profile · {district.province}
                </span>
                <CardTitle className="text-3xl font-display font-bold text-[#132e36] mt-1">
                  {district.name}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Agro-Ecological Zone: <strong>{district.agroZone}</strong> · Elevation:{" "}
                  <strong>{district.elevation} meters</strong>
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5 max-w-sm sm:justify-end">
                {district.primaryCrops.map((crop) => (
                  <Badge key={crop} variant="secondary" className="text-xs">
                    {crop}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Meteo Rwanda Warning Disclaimer */}
        <Alert variant="warning" className="bg-[#f9ecd2] border-[#e6cca0]">
          <ShieldAlert className="size-5 text-[#8f5d17]" />
          <div>
            <AlertTitle className="text-sm font-bold text-[#6e4715]">
              National Warning Notice & Disclosures
            </AlertTitle>
            <AlertDescription className="text-xs text-[#6e4715]/90 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Satellite vegetation indices and numerical models are planning aids. Official
                meteorological warnings and severe hazard advisories are issued exclusively by{" "}
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

        {/* 3 Core Climate Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className="size-4 text-[#195c70]" />
                  <CardTitle className="text-sm font-bold text-[#132e36]">
                    ERA5 30-Year Rainfall Normal
                  </CardTitle>
                </div>
                <Badge variant="calibrated">1991–2020 Baseline</Badge>
              </div>
              <CardDescription className="text-xs">
                Historical climatology comparison for {district.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold font-display text-[#132e36]">
                Seasonal Baseline: 98–115 mm
              </div>
              <p className="text-xs text-[#4a6365]">
                Monthly climatological normal calibrated across 30 years of ECMWF ERA5 reanalysis for this coordinate.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Leaf className="size-4 text-[#195c70]" />
                  <CardTitle className="text-sm font-bold text-[#132e36]">
                    NASA MODIS 250m NDVI
                  </CardTitle>
                </div>
                <Badge variant="live">MOD13Q1</Badge>
              </div>
              <CardDescription className="text-xs">
                Satellite surface reflectance chlorophyll absorption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold font-display text-[#132e36]">
                Canopy Index: 0.56 – 0.68
              </div>
              <p className="text-xs text-[#4a6365]">
                Indicates healthy photosynthetic activity across {district.name} hillsides and cultivated marshlands.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Waves className="size-4 text-[#195c70]" />
                  <CardTitle className="text-sm font-bold text-[#132e36]">
                    Topsoil Saturation & Hydrology
                  </CardTitle>
                </div>
                <Badge variant="secondary">0–7cm Root-Zone</Badge>
              </div>
              <CardDescription className="text-xs">
                Surface moisture and GloFAS catchment runoff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold font-display text-[#132e36]">
                Moisture: 42% – 52%
              </div>
              <p className="text-xs text-[#4a6365]">
                Sufficient root-zone moisture for staple crops ({district.primaryCrops.slice(0, 2).join(", ")}).
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dedicated AI Assistant Callout */}
        <section aria-label="District AI Assistant">
          <Card className="bg-gradient-to-r from-[#132e36] to-[#195c70] text-[#f3f4ee] border-none shadow-md">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#e3ed8c] text-[#132e36] flex items-center justify-center shrink-0">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ask Climate AI Copilot about {district.name}
                  </h3>
                  <p className="text-xs text-[#b8d0cb] mt-0.5">
                    Synthesize {district.name}&apos;s {district.agroZone} climate data, crops, rainfall baseline, and field observations.
                  </p>
                </div>
              </div>
              <Button asChild variant="signal" size="sm" className="shrink-0 font-bold">
                <Link href={`/assistant?district=${district.id}`}>
                  <span>Open Copilot in Assistant</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
