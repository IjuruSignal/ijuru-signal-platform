import { NextRequest, NextResponse } from 'next/server';
import {
  RWANDA_DISTRICTS,
  findNearestDistrict,
  type DistrictMetadata,
} from '@/features/locations/data/rwanda-districts';

export interface PlaceSearchResult {
  id: string;
  name: string;
  admin1: string;
  admin2: string;
  lat: number;
  lon: number;
  elevation: number;
  kind: 'district' | 'locality';
  nearestDistrictId: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const lowerQuery = query.toLowerCase();
    const results: PlaceSearchResult[] = [];
    const seenNames = new Set<string>();

    // 1. Search local authoritative Rwanda districts
    const matchedDistricts = RWANDA_DISTRICTS.filter((d: DistrictMetadata) => {
      return (
        d.name.toLowerCase().includes(lowerQuery) ||
        d.id.toLowerCase().includes(lowerQuery) ||
        d.province.toLowerCase().includes(lowerQuery)
      );
    });

    for (const d of matchedDistricts) {
      seenNames.add(d.name.toLowerCase());
      seenNames.add(d.id.toLowerCase());
      results.push({
        id: d.id,
        name: d.name,
        admin1: d.province,
        admin2: `${d.name} District`,
        lat: d.lat,
        lon: d.lon,
        elevation: d.elevation,
        kind: 'district',
        nearestDistrictId: d.id,
      });
    }

    // 2. Query Open-Meteo Geocoding API for localities, towns, sectors in Rwanda
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=8&language=en&format=json&countryCode=RW`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(geoUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.results) ? json.results : [];

        for (const item of items) {
          const itemNameLower = (item.name || '').toLowerCase();
          if (seenNames.has(itemNameLower)) {
            continue;
          }
          seenNames.add(itemNameLower);

          const nearest = findNearestDistrict(item.latitude, item.longitude);
          const isDistrictLevel =
            item.feature_code === 'ADM2' ||
            RWANDA_DISTRICTS.some((d) => d.name.toLowerCase() === itemNameLower);

          results.push({
            id: isDistrictLevel ? nearest.id : `loc-${item.id}`,
            name: item.name,
            admin1: item.admin1 || nearest.province,
            admin2: item.admin2 || `${nearest.name} District`,
            lat: Number(item.latitude.toFixed(5)),
            lon: Number(item.longitude.toFixed(5)),
            elevation: Math.round(item.elevation ?? nearest.elevation),
            kind: isDistrictLevel ? 'district' : 'locality',
            nearestDistrictId: nearest.id,
          });
        }
      }
    } catch {
      // If external geocoding fails or times out, proceed with matched local districts
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to search places' },
      { status: 500 }
    );
  }
}
