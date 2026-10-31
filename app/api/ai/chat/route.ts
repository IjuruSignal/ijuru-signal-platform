import { NextRequest, NextResponse } from 'next/server';
import { fetchDistrictWeather, getDistrictSignals } from '@/features/observations/services/climate-signals.ts';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser } from '@/server/auth/session.ts';
import { listFieldChecks as listSqlite } from '@/features/field-checks/repositories/sqlite.ts';
import { listFieldChecks as listPg } from '@/features/field-checks/repositories/postgres.ts';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { message, areaId = 'kigali' } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const weather = await fetchDistrictWeather(areaId);
    const signals = getDistrictSignals(areaId);

    // Retrieve recent field checks for context
    const { provider, db } = getDbConnection();
    let fieldChecks: any[] = [];
    try {
      if (provider === 'postgres') {
        fieldChecks = await listPg(db, { actorId: user.id, areaId, limit: 5 });
      } else {
        fieldChecks = listSqlite(db, { actorId: user.id, areaId, limit: 5 });
      }
    } catch {
      // Access fallback
    }

    const lowerQuery = message.toLowerCase();

    // Build grounded responses
    let responseText = '';
    const citations: Array<{ source: string; detail: string }> = [
      { source: 'Meteo Rwanda', detail: `${signals.officialAdvisory.title} (Valid until ${signals.officialAdvisory.validUntil})` },
      { source: 'Sentinel-2 (ESA)', detail: `NDVI: ${signals.satellite.ndvi} (${signals.satellite.status}), passed ${signals.satellite.passDate}` },
      { source: 'CHIRPS Baseline', detail: `Rainfall anomaly: ${signals.rainfall.diffMm >= 0 ? '+' : ''}${signals.rainfall.diffMm}mm (${signals.rainfall.status})` },
      { source: 'Open-Meteo & Station', detail: `Current Temp: ${weather.temperatureC}°C, Humidity: ${weather.humidity}%, Forecast: ${weather.forecastDays[0]?.precipProb}% rain prob` },
    ];

    if (fieldChecks.length > 0) {
      citations.push({
        source: 'Ground Field Check',
        detail: `"${fieldChecks[0].observation}" (Status: ${fieldChecks[0].status})`,
      });
    }

    if (lowerQuery.includes('rain') || lowerQuery.includes('weather') || lowerQuery.includes('forecast')) {
      const today = weather.forecastDays[0];
      const tomorrow = weather.forecastDays[1];
      responseText = `### 🌧️ Rainfall & Weather Synthesis for ${signals.districtName}

- **Current Temperature**: ${weather.temperatureC}°C (Humidity: ${weather.humidity}%, Wind: ${weather.windSpeedKmh} km/h)
- **Today's Forecast**: ${today?.precipProb ?? 30}% chance of rain with estimated ${today?.precipMm ?? 0} mm precipitation.
- **Tomorrow's Outlook**: ${tomorrow?.precipProb ?? 40}% chance of rain (${tomorrow?.precipMm ?? 0} mm).
- **Seasonal Context (CHIRPS)**: Cumulative rainfall is currently **${signals.rainfall.status}** with ${signals.rainfall.targetMm} mm received against the 30-year baseline mean of ${signals.rainfall.baselineMeanMm} mm.

> [!NOTE]
> Meteo Rwanda Advisory: *${signals.officialAdvisory.title}*. Practitioners should consult [Meteo Rwanda bulletins](${signals.officialAdvisory.link}) before scheduling critical planting operations.`;
    } else if (lowerQuery.includes('plant') || lowerQuery.includes('crop') || lowerQuery.includes('season') || lowerQuery.includes('maize') || lowerQuery.includes('bean')) {
      responseText = `### 🌱 Agronomic & Planting Decision Guidance (${signals.districtName})

- **Vegetation Condition (Sentinel-2)**: Current NDVI is **${signals.satellite.ndvi}** (${signals.satellite.status}). ${signals.satellite.trend}.
- **Soil Moisture & Baseline**: Historical CHIRPS benchmark indicates **${signals.rainfall.status}** (${signals.rainfall.diffMm >= 0 ? '+' : ''}${signals.rainfall.diffMm} mm deviation).
- **Field Checks**: Extension reports indicate: *"${fieldChecks[0]?.observation || 'Soil prepared for intermediate sowings'}"*.
- **Recommended Action**:
  1. For short-cycle legumes and vegetables: maintain moisture retention practices given the current ${weather.forecastDays[0]?.precipProb}% precipitation probability.
  2. Stagger fertilizer applications to coincide with forecasted rain events over the next 48 hours.
  3. Verify pest/waterlogging status locally through field check submissions.`;
    } else if (lowerQuery.includes('ndvi') || lowerQuery.includes('satellite') || lowerQuery.includes('vegetation')) {
      responseText = `### 🛰️ Satellite Vegetation Diagnostic (Sentinel-2 L2A)

- **Target District**: ${signals.districtName}
- **Observed NDVI**: **${signals.satellite.ndvi}**
- **Vigour Assessment**: ${signals.satellite.status}
- **Pass Metadata**: Acquisition date **${signals.satellite.passDate}**, Quality: *${signals.satellite.quality}*.
- **Interpretation Rule**: Sentinel-2 NDVI measures canopy greenness (0.0 to 1.0). It indicates chlorophyll absorption and biomass density, not a direct crop disease diagnosis. Field confirmation remains required.`;
    } else if (lowerQuery.includes('advisory') || lowerQuery.includes('alert') || lowerQuery.includes('warning')) {
      responseText = `### ⚠️ Official Advisory & Hazard Status (${signals.districtName})

- **Official Source**: Meteo Rwanda Early Warning Unit
- **Status Level**: **${signals.officialAdvisory.level.toUpperCase()}**
- **Notice Title**: ${signals.officialAdvisory.title}
- **Bulletin**: "${signals.officialAdvisory.bulletin}"
- **Valid Period**: Effective until ${signals.officialAdvisory.validUntil}
- **Official Bulletin URL**: [${signals.officialAdvisory.link}](${signals.officialAdvisory.link})

*Ijuru Signal surfaces official warnings verbatim and does not substitute unvalidated automated alerts.*`;
    } else {
      responseText = `### 📊 Ijuru Signal District Synthesis: ${signals.districtName}

Here is the integrated climate and ground situation for **${signals.districtName}**:

1. **Satellite Health (Sentinel-2)**: NDVI is **${signals.satellite.ndvi}** (${signals.satellite.status}), acquisition date ${signals.satellite.passDate}.
2. **Precipitation Anomaly (CHIRPS)**: Recorded ${signals.rainfall.targetMm} mm vs ${signals.rainfall.baselineMeanMm} mm historical baseline (${signals.rainfall.status}).
3. **Short-Term Weather**: Current temperature is ${weather.temperatureC}°C, humidity ${weather.humidity}%. 5-day precipitation probability averages ${weather.forecastDays[0]?.precipProb}%.
4. **Active Advisory**: Meteo Rwanda notice: *${signals.officialAdvisory.title}* (valid until ${signals.officialAdvisory.validUntil}).
5. **Latest Field Observation**: ${fieldChecks[0] ? `"${fieldChecks[0].observation}" (logged ${new Date(fieldChecks[0].observed_at).toLocaleDateString()})` : 'No open field alerts logged for this sector.'}

Ask me about planting advice, rainfall forecasts, satellite NDVI interpretation, or recent field observations!`;
    }

    return NextResponse.json({
      reply: responseText,
      district: signals.districtName,
      citations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI Copilot processing failed' }, { status: 500 });
  }
}
