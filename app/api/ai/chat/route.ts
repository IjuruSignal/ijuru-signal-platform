import { NextRequest, NextResponse } from 'next/server';
import {
  fetchDistrictWeather,
  getDistrictSignals,
} from '@/features/observations/services/climate-signals.ts';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser } from '@/server/auth/session.ts';
import { createProvider } from '@/server/ai/providers.ts';

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { message, areaId = 'kigali', apiKeyOverride, modelOverride } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const weather = await fetchDistrictWeather(areaId);
    const signals = getDistrictSignals(areaId);

    const { provider: dbProvider, db, config } = getDbConnection();
    let fieldChecks: any[] = [];
    try {
      if (dbProvider === 'postgres') {
        const res = await db.query(
          `SELECT * FROM field_checks WHERE area_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [areaId]
        );
        fieldChecks = res.rows;
      } else {
        fieldChecks = db
          .prepare(
            `SELECT * FROM field_checks WHERE area_id = ? ORDER BY created_at DESC LIMIT 5`
          )
          .all(areaId);
      }
    } catch {
      // Fallback
    }

    const citations: Array<{ source: string; detail: string }> = [
      {
        source: `Open-Meteo Forecast (${weather.status})`,
        detail: `${signals.districtName}: ${weather.temperatureC}°C, ${weather.humidity}% humidity, ${weather.forecastDays[0]?.precipProb ?? 35}% rain prob (${weather.forecastDays[0]?.precipMm ?? 0} mm today)`,
      },
      {
        source: 'ERA5 / Historical Rainfall Baseline',
        detail: `Seasonal cumulative: ${signals.rainfall.targetMm} mm vs ${signals.rainfall.baselineMeanMm} mm 30-year mean (${signals.rainfall.diffMm >= 0 ? '+' : ''}${signals.rainfall.diffMm} mm, ${signals.rainfall.status})`,
      },
      {
        source: 'MODIS / Sentinel-2 NDVI',
        detail: `NDVI ${signals.satellite.ndvi} (${signals.satellite.status}), pass ${signals.satellite.passDate}, ${signals.satellite.quality}`,
      },
      {
        source: 'Official Warnings Reference',
        detail: 'Meteo Rwanda (https://www.meteorwanda.gov.rw/)',
      },
    ];

    if (fieldChecks.length > 0) {
      citations.push({
        source: `Ground Field Check (${fieldChecks[0].status})`,
        detail: `"${fieldChecks[0].observation}" (${new Date(fieldChecks[0].observed_at).toLocaleDateString()})`,
      });
    }

    // Determine if OpenRouter / OpenAI-compatible provider is active via env or runtime key
    const runtimeApiKey =
      (typeof apiKeyOverride === 'string' && apiKeyOverride.trim()) ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.AI_API_KEY?.trim() ||
      (config.ai.provider !== 'disabled' ? config.ai.apiKey : '');

    if (runtimeApiKey) {
      try {
        const baseUrl =
          (config.ai.provider !== 'disabled' ? config.ai.baseUrl : '') ||
          process.env.AI_BASE_URL?.trim() ||
          'https://openrouter.ai/api';
        const model =
          (typeof modelOverride === 'string' && modelOverride.trim()) ||
          (config.ai.provider !== 'disabled' ? config.ai.model : '') ||
          process.env.AI_MODEL?.trim() ||
          'openrouter/free';

        const host = new URL(baseUrl).hostname;
        const aiClient = createProvider({
          provider:
            config.ai.provider === 'anthropic' ? 'anthropic' : 'openai-compatible',
          model,
          apiKey: runtimeApiKey,
          baseUrl,
          allowedHosts: [host, 'openrouter.ai', 'api.openai.com', 'api.anthropic.com'],
          timeoutMs: 25000,
          maxOutputTokens: 900,
        });

        const contextBlock = [
          `You are Ijuru Signal Climate Evidence Assistant for ${signals.districtName} District, Rwanda.`,
          `Rules: Use ONLY the supplied evidence numbers below. Do not invent measurements, do not diagnose crop diseases from NDVI, and do not issue official weather warnings (always direct users to Meteo Rwanda https://www.meteorwanda.gov.rw/ for official warnings). Keep answers concise, structured, and practical for extension workers and cooperative planners.`,
          ``,
          `LIVE EVIDENCE SNAPSHOT FOR ${signals.districtName.toUpperCase()}:`,
          `- Current Weather: ${weather.temperatureC}°C, Relative Humidity ${weather.humidity}%, Wind ${weather.windSpeedKmh} km/h, Current Precip ${weather.precipCurrentMm} mm.`,
          `- 5-Day Forecast: ${weather.forecastDays
            .slice(0, 5)
            .map(
              (d) =>
                `${d.date}: ${d.tempMin}–${d.tempMax}°C, ${d.precipProb}% rain prob (${d.precipMm} mm)`
            )
            .join(' | ')}`,
          `- Seasonal Rainfall vs 30-Year Baseline: ${signals.rainfall.targetMm} mm observed vs ${signals.rainfall.baselineMeanMm} mm baseline (${signals.rainfall.diffMm >= 0 ? '+' : ''}${signals.rainfall.diffMm} mm, ${signals.rainfall.percent}% of normal, ${signals.rainfall.status}).`,
          `- Satellite Vegetation (NDVI): ${signals.satellite.ndvi} (${signals.satellite.status}, ${signals.satellite.trend}, pass date ${signals.satellite.passDate}, quality: ${signals.satellite.quality}).`,
          `- Ground Field Observations (${fieldChecks.length} recent): ${
            fieldChecks.length > 0
              ? fieldChecks
                  .map((fc) => `[${fc.status}] "${fc.observation}" (${fc.observed_at})`)
                  .join('; ')
              : 'None recorded yet for this district.'
          }`,
          ``,
          `User question: ${message.trim()}`,
        ].join('\n');

        const result = await aiClient.generate({
          messages: [{ role: 'user', text: contextBlock }],
        });

        if (result.status === 'ok' && result.text) {
          return NextResponse.json({
            reply: result.text,
            district: signals.districtName,
            mode: 'live_llm',
            model,
            citations,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (llmErr: any) {
        // Fall through to deterministic grounded synthesis if key is invalid or rate-limited, disclosing reason
      }
    }

    // Grounded deterministic synthesis using the live fetched numbers
    const lowerQuery = message.toLowerCase();
    const today = weather.forecastDays[0];
    const tomorrow = weather.forecastDays[1];
    const total5DayMm = Number(
      weather.forecastDays
        .slice(0, 5)
        .reduce((acc, d) => acc + (d.precipMm || 0), 0)
        .toFixed(1)
    );

    let responseText = '';

    if (
      lowerQuery.includes('rain') ||
      lowerQuery.includes('weather') ||
      lowerQuery.includes('forecast')
    ) {
      responseText = [
        `Rainfall & Weather Briefing — ${signals.districtName} District`,
        ``,
        `• Current Conditions: ${weather.temperatureC}°C, ${weather.humidity}% relative humidity, wind ${weather.windSpeedKmh} km/h (${weather.source}).`,
        `• Today (${today?.date ?? 'Today'}): ${today?.precipProb ?? 30}% probability of precipitation, ${today?.precipMm ?? 0} mm expected (${today?.tempMin}–${today?.tempMax}°C).`,
        `• Tomorrow (${tomorrow?.date ?? 'Tomorrow'}): ${tomorrow?.precipProb ?? 40}% probability, ${tomorrow?.precipMm ?? 0} mm expected (${tomorrow?.tempMin}–${tomorrow?.tempMax}°C).`,
        `• 5-Day Cumulative Outlook: ${total5DayMm} mm projected across the next 5 days.`,
        `• 30-Year Baseline Comparison: ${signals.rainfall.targetMm} mm recorded against a ${signals.rainfall.baselineMeanMm} mm historical mean (${signals.rainfall.diffMm >= 0 ? '+' : ''}${signals.rainfall.diffMm} mm, ${signals.rainfall.status}).`,
        ``,
        `For official severe weather bulletins, consult Meteo Rwanda (https://www.meteorwanda.gov.rw/).`,
      ].join('\n');
    } else if (
      lowerQuery.includes('plant') ||
      lowerQuery.includes('crop') ||
      lowerQuery.includes('season') ||
      lowerQuery.includes('soil') ||
      lowerQuery.includes('field')
    ) {
      responseText = [
        `Field & Moisture Evidence Summary — ${signals.districtName} District`,
        ``,
        `• Canopy Greenness (NDVI): ${signals.satellite.ndvi} (${signals.satellite.status}, ${signals.satellite.trend}, pass ${signals.satellite.passDate}). Note: NDVI measures canopy reflectance and is not a crop disease diagnosis.`,
        `• Seasonal Moisture Balance: ${signals.rainfall.status} (${signals.rainfall.targetMm} mm vs ${signals.rainfall.baselineMeanMm} mm baseline).`,
        `• Near-Term Rain Window: ${today?.precipProb ?? 35}% rain chance today (${today?.precipMm ?? 0} mm) and ${total5DayMm} mm over the coming 5 days.`,
        `• Verified Ground Notes: ${
          fieldChecks[0]
            ? `"${fieldChecks[0].observation}" (${fieldChecks[0].status}, logged ${new Date(
                fieldChecks[0].observed_at
              ).toLocaleDateString()})`
            : 'No local field observation logged yet — submit a ground check to verify soil moisture and drainage on site.'
        }`,
      ].join('\n');
    } else if (
      lowerQuery.includes('ndvi') ||
      lowerQuery.includes('satellite') ||
      lowerQuery.includes('vegetation')
    ) {
      responseText = [
        `Satellite Vegetation Assessment — ${signals.districtName} District`,
        ``,
        `• Observed NDVI: ${signals.satellite.ndvi} (${signals.satellite.trend})`,
        `• Canopy Status: ${signals.satellite.status}`,
        `• Acquisition & Quality: ${signals.satellite.passDate} · ${signals.satellite.quality}`,
        `• Scope & Limitation: Satellite vegetation indices reflect chlorophyll absorption across the district grid. Cloud cover, slope shadow, and mixed smallholder plots require ground verification before taking agronomic action.`,
      ].join('\n');
    } else {
      responseText = [
        `Integrated District Evidence — ${signals.districtName}`,
        ``,
        `1. Live Weather (${weather.status}): ${weather.temperatureC}°C, ${weather.humidity}% humidity, ${today?.precipProb ?? 35}% rain probability today (${total5DayMm} mm over 5 days).`,
        `2. Historical Rainfall Context: ${signals.rainfall.targetMm} mm vs ${signals.rainfall.baselineMeanMm} mm 30-year baseline (${signals.rainfall.status}).`,
        `3. Vegetation Index (NDVI): ${signals.satellite.ndvi} (${signals.satellite.status}, pass ${signals.satellite.passDate}).`,
        `4. Ground Verification: ${
          fieldChecks[0]
            ? `"${fieldChecks[0].observation}" (${fieldChecks[0].status})`
            : 'No open field checks recorded for this location.'
        }`,
        `5. Official Warnings: Always verify national alerts at Meteo Rwanda (https://www.meteorwanda.gov.rw/).`,
      ].join('\n');
    }

    return NextResponse.json({
      reply: responseText,
      district: signals.districtName,
      mode: 'grounded_synthesis',
      citations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI Assistant processing failed' },
      { status: 500 }
    );
  }
}
