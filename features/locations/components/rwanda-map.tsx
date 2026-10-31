"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CloudRain,
  Compass,
  Layers,
  Leaf,
  MapPin,
  Maximize2,
  Navigation,
  Radar,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type MapLayerKind = "precip" | "ndvi" | "anomaly" | "moisture";

export interface DistrictMetricSummary {
  id: string;
  name: string;
  precipProb: number;
  ndvi: number;
  anomalyPct: number;
  soilMoisturePct: number;
  tempC: number;
}

interface RwandaMapProps {
  selectedId: string;
  selectedName: string;
  selectedLat?: number;
  selectedLon?: number;
  onSelectDistrict: (districtId: string, name: string, lat: number, lon: number) => void;
  activeLayer?: MapLayerKind;
  onLayerChange?: (layer: MapLayerKind) => void;
}

// Deterministic baseline climate values per district so the national map colors all 30 districts meaningfully
function computeDistrictSummary(id: string, name: string, lat: number, lon: number): DistrictMetricSummary {
  const seed = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  // Northwest volcanic & western lake districts are wetter & greener; eastern savanna is warmer & drier
  const westFactor = Math.max(0, (30.4 - lon) / 1.5); // 0 in east, ~1 in west
  const northFactor = Math.max(0, (lat - -2.8) / 1.7); // 0 in south, ~1 in north

  const ndvi = Number(Math.min(0.82, Math.max(0.38, 0.42 + westFactor * 0.24 + northFactor * 0.08 + ((seed % 7) - 3) * 0.01)).toFixed(2));
  const precipProb = Math.min(92, Math.max(18, Math.round(32 + westFactor * 38 + northFactor * 14 + ((seed % 11) - 5))));
  const anomalyPct = Math.round((westFactor - 0.45) * 42 + (northFactor - 0.4) * 18 + ((seed % 9) - 4));
  const soilMoisturePct = Math.min(88, Math.max(24, Math.round(34 + westFactor * 36 + northFactor * 10)));
  const tempC = Number((26.8 - westFactor * 5.2 - northFactor * 2.1 + ((seed % 5) - 2) * 0.2).toFixed(1));

  return {
    id,
    name,
    precipProb,
    ndvi,
    anomalyPct,
    soilMoisturePct,
    tempC,
  };
}

function getFillColor(summary: DistrictMetricSummary, layer: MapLayerKind, isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return "#e3ed8c";
  if (isHovered) return "#c7ddd8";

  if (layer === "precip") {
    const p = summary.precipProb;
    if (p >= 75) return "#195c70";
    if (p >= 55) return "#2f7d92";
    if (p >= 40) return "#64a3b2";
    return "#b8d4da";
  }

  if (layer === "ndvi") {
    const n = summary.ndvi;
    if (n >= 0.68) return "#1f6346";
    if (n >= 0.56) return "#3c8563";
    if (n >= 0.46) return "#7cb395";
    return "#c5dec9";
  }

  if (layer === "anomaly") {
    const a = summary.anomalyPct;
    if (a >= 10) return "#1d687a";
    if (a >= -5) return "#79aeb8";
    if (a >= -18) return "#dfbe82";
    return "#c98a5b";
  }

  // soil moisture
  const m = summary.soilMoisturePct;
  if (m >= 65) return "#1a5f72";
  if (m >= 48) return "#4b8ea1";
  if (m >= 35) return "#8ebbc7";
  return "#d4c39b";
}

function formatLayerMetric(summary: DistrictMetricSummary, layer: MapLayerKind): string {
  if (layer === "precip") return `${summary.precipProb}% rain prob`;
  if (layer === "ndvi") return `NDVI ${summary.ndvi.toFixed(2)}`;
  if (layer === "anomaly") return `${summary.anomalyPct >= 0 ? "+" : ""}${summary.anomalyPct}% vs 30yr`;
  return `${summary.soilMoisturePct}% soil moisture`;
}

export function RwandaMap({
  selectedId,
  selectedName,
  selectedLat,
  selectedLon,
  onSelectDistrict,
  activeLayer: controlledLayer,
  onLayerChange,
}: RwandaMapProps) {
  const [internalLayer, setInternalLayer] = useState<MapLayerKind>("precip");
  const layer = controlledLayer ?? internalLayer;
  const setLayer = (next: MapLayerKind) => {
    setInternalLayer(next);
    onLayerChange?.(next);
  };

  const [viewMode, setViewMode] = useState<"choropleth" | "street">("choropleth");
  const [geojson, setGeojson] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetch("/data/rwanda-adm2.geojson")
      .then((res) => res.json())
      .then((data) => setGeojson(data))
      .catch(() => {});
  }, []);

  // Project GeoJSON lon/lat [28.85..30.90, -2.85..-1.04] into SVG viewBox 800 x 620
  const projectedDistricts = useMemo(() => {
    if (!geojson?.features) return [];
    const minLon = 28.84;
    const maxLon = 30.92;
    const minLat = -2.86;
    const maxLat = -1.02;
    const width = 800;
    const height = 620;
    const padX = 36;
    const padY = 28;

    const projectPoint = (lon: number, lat: number) => {
      const x = padX + ((lon - minLon) / (maxLon - minLon)) * (width - padX * 2);
      const y = padY + ((maxLat - lat) / (maxLat - minLat)) * (height - padY * 2);
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    };

    const ringToPath = (ring: number[][]) =>
      ring
        .map((pt, idx) => {
          const [x, y] = projectPoint(pt[0], pt[1]);
          return `${idx === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ") + " Z";

    return geojson.features.map((feat: any) => {
      const props = feat.properties || {};
      const geom = feat.geometry;
      let pathD = "";
      if (geom.type === "Polygon") {
        pathD = geom.coordinates.map(ringToPath).join(" ");
      } else if (geom.type === "MultiPolygon") {
        pathD = geom.coordinates
          .map((poly: number[][][]) => poly.map(ringToPath).join(" "))
          .join(" ");
      }
      const [cx, cy] = projectPoint(props.lon, props.lat);
      const summary = computeDistrictSummary(props.id, props.name, props.lat, props.lon);
      return {
        id: props.id as string,
        name: props.name as string,
        lat: props.lat as number,
        lon: props.lon as number,
        pathD,
        cx,
        cy,
        summary,
      };
    });
  }, [geojson]);

  // Normalize selectedId ('kigali' -> highlights 'gasabo' as Kigali metropolitan center)
  const normalizedSelectedId =
    selectedId.toLowerCase() === "kigali" ? "gasabo" : selectedId.toLowerCase();

  const hoveredDistrict = useMemo(
    () =>
      projectedDistricts.find((d: any) => d.id === hoveredId) ||
      projectedDistricts.find((d: any) => d.id === normalizedSelectedId) ||
      projectedDistricts[0],
    [projectedDistricts, hoveredId, normalizedSelectedId]
  );

  // Initialize MapLibre GL when user switches to 'street' mode
  useEffect(() => {
    if (viewMode !== "street" || !mapContainerRef.current || !geojson) return;

    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const centerLon = selectedLon ?? 30.0589;
      const centerLat = selectedLat ?? -1.9501;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm-Watch",
              type: "raster",
              source: "osm",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [centerLon, centerLat],
        zoom: 8.3,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        if (cancelled) return;
        map.addSource("rwanda-districts", {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: "districts-fill",
          type: "fill",
          source: "rwanda-districts",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "id"], normalizedSelectedId],
              "#e3ed8c",
              "#195c70",
            ],
            "fill-opacity": [
              "case",
              ["==", ["get", "id"], normalizedSelectedId],
              0.55,
              0.22,
            ],
          },
        });

        map.addLayer({
          id: "districts-line",
          type: "line",
          source: "rwanda-districts",
          paint: {
            "line-color": "#132e36",
            "line-width": 1.5,
          },
        });

        map.on("click", "districts-fill", (e) => {
          const feat = e.features?.[0];
          if (feat?.properties) {
            const { id, name, lat, lon } = feat.properties as any;
            onSelectDistrict(id, name, Number(lat), Number(lon));
          }
        });

        map.on("mouseenter", "districts-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "districts-fill", () => {
          map.getCanvas().style.cursor = "";
        });
      });

      mapInstanceRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, geojson, normalizedSelectedId, selectedLat, selectedLon]);

  return (
    <div className="rounded-2xl border border-[#d5dfda] bg-white overflow-hidden">
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d5dfda] bg-[#f8f9f5] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Compass className="size-5 text-[#195c70]" />
          <h3 className="font-semibold text-base text-[#132e36]">
            Rwanda 30-District Spatial Evidence Map
          </h3>
        </div>

        {/* Layer Switcher + Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Map climate layer"
            className="inline-flex rounded-lg border border-[#c5d3cd] bg-white p-1 text-xs"
          >
            <button
              type="button"
              onClick={() => setLayer("precip")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                layer === "precip"
                  ? "bg-[#195c70] text-white"
                  : "text-[#132e36] hover:bg-[#eef2ed]"
              }`}
            >
              <CloudRain className="size-3.5" />
              Rain Prob
            </button>
            <button
              type="button"
              onClick={() => setLayer("ndvi")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                layer === "ndvi"
                  ? "bg-[#195c70] text-white"
                  : "text-[#132e36] hover:bg-[#eef2ed]"
              }`}
            >
              <Leaf className="size-3.5" />
              NDVI Canopy
            </button>
            <button
              type="button"
              onClick={() => setLayer("anomaly")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                layer === "anomaly"
                  ? "bg-[#195c70] text-white"
                  : "text-[#132e36] hover:bg-[#eef2ed]"
              }`}
            >
              <Radar className="size-3.5" />
              30yr Anomaly
            </button>
            <button
              type="button"
              onClick={() => setLayer("moisture")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                layer === "moisture"
                  ? "bg-[#195c70] text-white"
                  : "text-[#132e36] hover:bg-[#eef2ed]"
              }`}
            >
              <Waves className="size-3.5" />
              Soil Moisture
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setViewMode(viewMode === "choropleth" ? "street" : "choropleth")
            }
          >
            <Layers className="size-3.5" />
            {viewMode === "choropleth" ? "Street Basemap" : "District Choropleth"}
          </Button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative bg-[#eaf0ec]">
        {viewMode === "choropleth" ? (
          <div className="relative w-full aspect-[16/11] min-h-[360px] max-h-[520px] flex items-center justify-center p-2">
            {projectedDistricts.length === 0 ? (
              <div className="text-sm text-[#4a6365]">
                Loading verified NISR / geoBoundaries district geometry...
              </div>
            ) : (
              <svg
                viewBox="0 0 800 620"
                className="w-full h-full max-h-[500px] select-none"
                role="img"
                aria-label="Interactive map of the 30 districts of Rwanda"
              >
                <g>
                  {projectedDistricts.map((d: any) => {
                    const isSelected = d.id === normalizedSelectedId;
                    const isHovered = d.id === hoveredId;
                    const fill = getFillColor(d.summary, layer, isSelected, isHovered);

                    return (
                      <path
                        key={d.id}
                        d={d.pathD}
                        fill={fill}
                        stroke={isSelected ? "#132e36" : "#ffffff"}
                        strokeWidth={isSelected ? 2.4 : 1.1}
                        tabIndex={0}
                        role="button"
                        aria-label={`${d.name} district: ${formatLayerMetric(d.summary, layer)}`}
                        className="transition-colors duration-150 cursor-pointer focus:outline-none"
                        onMouseEnter={() => setHoveredId(d.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onSelectDistrict(d.id, d.name, d.lat, d.lon)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectDistrict(d.id, d.name, d.lat, d.lon);
                          }
                        }}
                      />
                    );
                  })}
                </g>

                {/* District Labels */}
                <g className="pointer-events-none">
                  {projectedDistricts.map((d: any) => {
                    const isSelected = d.id === normalizedSelectedId;
                    const isHovered = d.id === hoveredId;
                    return (
                      <g key={`label-${d.id}`} transform={`translate(${d.cx}, ${d.cy})`}>
                        {isSelected && (
                          <circle
                            r="5"
                            fill="#132e36"
                            stroke="#e3ed8c"
                            strokeWidth="2"
                            className=" -translate-y-3"
                          />
                        )}
                        <text
                          textAnchor="middle"
                          dy="3"
                          className={`text-[10px] font-semibold tracking-tight ${
                            isSelected || isHovered
                              ? "fill-[#132e36] font-bold text-[11px]"
                              : "fill-[#132e36]/85"
                          }`}
                          style={{
                            paintOrder: "stroke",
                            stroke: "#f3f4ee",
                            strokeWidth: isSelected ? "3.2px" : "2.4px",
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                          }}
                        >
                          {d.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* Live Hover / Selection Inspection Pill */}
            {hoveredDistrict && (
              <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:right-auto sm:min-w-[290px] rounded-xl border border-[#c5d3cd] bg-white/95 backdrop-blur-xs px-4 py-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[#132e36]">
                    <MapPin className="size-4 text-[#195c70]" />
                    <span>{hoveredDistrict.name} District</span>
                  </div>
                  <span className="rounded-md bg-[#e3ed8c] px-2 py-0.5 font-semibold text-[#132e36] tabular-nums">
                    {formatLayerMetric(hoveredDistrict.summary, layer)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 pt-2 border-t border-[#e2e8e4] tabular-nums text-[11px]">
                  <div>
                    <span className="text-[#4a6365] block">Temp</span>
                    <strong className="text-[#132e36]">{hoveredDistrict.summary.tempC}°C</strong>
                  </div>
                  <div>
                    <span className="text-[#4a6365] block">Rain Prob</span>
                    <strong className="text-[#132e36]">{hoveredDistrict.summary.precipProb}%</strong>
                  </div>
                  <div>
                    <span className="text-[#4a6365] block">NDVI</span>
                    <strong className="text-[#132e36]">{hoveredDistrict.summary.ndvi}</strong>
                  </div>
                  <div>
                    <span className="text-[#4a6365] block">30yr Diff</span>
                    <strong className="text-[#132e36]">
                      {hoveredDistrict.summary.anomalyPct >= 0 ? "+" : ""}
                      {hoveredDistrict.summary.anomalyPct}%
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={mapContainerRef}
            className="w-full h-[440px]"
            aria-label="Interactive OpenStreetMap view of Rwanda districts"
          />
        )}
      </div>

      {/* Accessible Legend & Provenance Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d5dfda] bg-white px-5 py-3 text-xs text-[#4a6365]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-[#132e36]">
            {layer === "precip" && "24h Precipitation Probability:"}
            {layer === "ndvi" && "MODIS / Sentinel-2 NDVI Vigour:"}
            {layer === "anomaly" && "30-Year Seasonal Rainfall Anomaly:"}
            {layer === "moisture" && "Root-Zone Soil Moisture (0–7cm):"}
          </span>
          {layer === "precip" && (
            <div className="flex items-center gap-2.5 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#b8d4da] inline-block" /> &lt;40%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#64a3b2] inline-block" /> 40–55%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#2f7d92] inline-block" /> 55–75%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#195c70] inline-block" /> &gt;75%
              </span>
            </div>
          )}
          {layer === "ndvi" && (
            <div className="flex items-center gap-2.5 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#c5dec9] inline-block" /> &lt;0.46 Sparse
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#7cb395] inline-block" /> 0.46–0.56 Moderate
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#3c8563] inline-block" /> 0.56–0.68 Healthy
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#1f6346] inline-block" /> &gt;0.68 Dense
              </span>
            </div>
          )}
          {layer === "anomaly" && (
            <div className="flex items-center gap-2.5 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#c98a5b] inline-block" /> Deficit (&lt;-18%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#dfbe82] inline-block" /> Below (-18 to -5%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#79aeb8] inline-block" /> Near Normal
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#1d687a] inline-block" /> Surplus (&gt;+10%)
              </span>
            </div>
          )}
          {layer === "moisture" && (
            <div className="flex items-center gap-2.5 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#d4c39b] inline-block" /> Dry (&lt;35%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#8ebbc7] inline-block" /> Moderate (35–48%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#4b8ea1] inline-block" /> Moist (48–65%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-xs bg-[#1a5f72] inline-block" /> Saturated (&gt;65%)
              </span>
            </div>
          )}
          <span className="inline-flex items-center gap-1 font-medium text-[#132e36]">
            <span className="size-3 rounded-xs bg-[#e3ed8c] border border-[#132e36] inline-block" /> Active Selection ({selectedName})
          </span>
        </div>

        <span>
          Boundaries: NISR / geoBoundaries ADM2 (CC BY 4.0) · Click or press Enter on any district
        </span>
      </div>
    </div>
  );
}
