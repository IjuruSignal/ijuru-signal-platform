import { NextRequest, NextResponse } from 'next/server';
import { fetchDistrictWeather, getDistrictSignals } from '@/features/observations/services/climate-signals.ts';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ areaId: string }> }
) {
  try {
    const { areaId } = await segmentData.params;
    const weather = await fetchDistrictWeather(areaId);
    const signals = getDistrictSignals(areaId);

    return NextResponse.json({
      areaId,
      weather,
      satellite: signals.satellite,
      rainfall: signals.rainfall,
      officialAdvisory: signals.officialAdvisory,
      provenance: {
        disclaimer: 'Satellite vegetation indices and model forecasts are decision aids, not official disaster declarations or agronomic diagnoses.',
        meteoRwandaAttribution: 'Weather advisories are referenced from Meteo Rwanda official bulletins.',
        sentinelAttribution: 'Copernicus Sentinel-2 Level-2A surface reflectance (10m resolution).',
        chirpsAttribution: 'CHIRPS v2.0 0.05° historical baseline (1981-2025).',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch signals' }, { status: 500 });
  }
}
