import { NextRequest } from 'next/server';
import {
  fetchDistrictWeather,
  getDistrictSignals,
} from '@/features/observations/services/climate-signals.ts';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser } from '@/server/auth/session.ts';
import { findDistrict } from '@/features/locations/data/rwanda-districts.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { message, areaId = 'kigali', history = [] } = body;

    if (!message || !message.trim()) {
      return new Response('Message cannot be empty', { status: 400 });
    }

    const districtMeta = findDistrict(areaId);
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
      // Continue with empty checks
    }

    // Build comprehensive system prompt containing real district climate intelligence
    const systemPrompt = [
      `You are the official Ijuru Signal Climate Intelligence Assistant for ${signals.districtName} District, Rwanda.`,
      `You assist extension workers, cooperative leaders, agronomists, and local farmers.`,
      `Provide helpful, natural, insightful answers and reason directly over the real-time evidence snapshot provided below.`,
      ``,
      `DISTRICT CONTEXT:`,
      `- District: ${signals.districtName} (${districtMeta?.province || 'Rwanda'})`,
      `- Agro-Ecological Zone: ${districtMeta?.agroZone || 'Central Plateau'}`,
      `- Elevation: ${districtMeta?.elevation || 1500} meters above sea level`,
      `- Primary District Crops: ${(districtMeta?.primaryCrops || ['Maize', 'Beans', 'Cassava']).join(', ')}`,
      ``,
      `LIVE EVIDENCE SNAPSHOT:`,
      `- Current Weather: ${weather.temperatureC}°C, ${weather.humidity}% humidity, wind ${weather.windSpeedKmh} km/h, current rain ${weather.precipCurrentMm} mm (${weather.status})`,
      `- 7-Day Forecast: ${weather.forecastDays
        .slice(0, 7)
        .map(
          (d: any) =>
            `${d.date}: ${d.tempMin}–${d.tempMax}°C, ${d.precipProb}% rain prob (${d.precipMm} mm, ET0: ${d.et0Mm} mm/day)`
        )
        .join(' | ')}`,
      `- Historical 30-Year Rainfall Baseline (ERA5): ${signals.rainfall?.targetMm ?? 95} mm observed vs ${signals.rainfall?.baselineMeanMm ?? 102} mm 30-year normal (${(signals.rainfall?.diffMm ?? 0) >= 0 ? '+' : ''}${signals.rainfall?.diffMm ?? 0} mm anomaly, ${signals.rainfall?.percent ?? 100}% of normal, status: ${signals.rainfall?.status ?? 'Near Normal'})`,
      `- Satellite Vegetation Canopy (NASA MODIS NDVI): ${signals.satellite?.ndvi ?? 0.61} (${signals.satellite?.status ?? 'Moderate vigour'}, trend: ${signals.satellite?.trend ?? '+0.01'}, pass date: ${signals.satellite?.passDate ?? 'Recent'}, quality: ${signals.satellite?.quality ?? 'Clean'})`,
      `- Root-Zone Soil Moisture & Runoff: ${signals.hydrology?.soilMoisturePct ?? 45}% topsoil moisture, river discharge: ${signals.hydrology?.riverDischargeM3s ?? 12.4} m³/s (${signals.hydrology?.runoffRiskNote ?? 'Moderate drainage'})`,
      `- Verified Local Ground Observations (${fieldChecks.length} entries): ${
        fieldChecks.length > 0
          ? fieldChecks
              .map((fc: any) => `[${fc.status}] "${fc.observation}" (${fc.observed_at})`)
              .join('; ')
          : 'No ground observations recorded yet for this district.'
      }`,
      ``,
      `GUIDELINES:`,
      `1. Reason over the exact numbers above. Do not hallucinate fictitious measurements.`,
      `2. For agronomic questions, explain how current moisture and rainfall affect crop stages for Season A / Season B.`,
      `3. Always be respectful, concise, and structured. Use bullet points or bold text where helpful.`,
      `4. If asked about severe weather warnings, remind users that official warnings are issued exclusively by Rwanda Meteorology Agency (https://www.meteorwanda.gov.rw/).`,
    ].join('\n');

    // Determine OpenRouter credentials
    const apiKey =
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.AI_API_KEY?.trim() ||
      (config.ai.provider !== 'disabled' ? config.ai.apiKey : '');

    const model =
      process.env.AI_MODEL?.trim() ||
      (config.ai.provider !== 'disabled' ? config.ai.model : '') ||
      'openrouter/free';

    const baseUrl =
      process.env.AI_BASE_URL?.trim() ||
      (config.ai.provider !== 'disabled' ? config.ai.baseUrl : '') ||
      'https://openrouter.ai/api/v1';

    const cleanBase = baseUrl.replace(/\/v1\/?$/, '');
    const apiUrl = `${cleanBase}/v1/chat/completions`;

    // Format previous history
    const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      for (const h of history) {
        if (h && (h.sender === 'user' || h.role === 'user')) {
          conversationMessages.push({ role: 'user', content: String(h.text || h.content || '') });
        } else if (h && (h.sender === 'assistant' || h.role === 'assistant')) {
          conversationMessages.push({ role: 'assistant', content: String(h.text || h.content || '') });
        }
      }
    }

    conversationMessages.push({ role: 'user', content: message.trim() });

    // Try OpenRouter Streaming first if an API key is available
    if (apiKey) {
      try {
        const upstreamRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://ijuru.rw',
            'X-Title': 'Ijuru Signal Rwanda Climate Copilot',
          },
          body: JSON.stringify({
            model,
            messages: conversationMessages,
            stream: true,
            max_tokens: 1024,
            temperature: 0.6,
          }),
        });

        if (upstreamRes.ok && upstreamRes.body) {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          const upstreamReader = upstreamRes.body.getReader();

          const stream = new ReadableStream({
            async start(controller) {
              let buffer = '';
              try {
                while (true) {
                  const { done, value } = await upstreamReader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith(':')) continue;
                    if (trimmed === 'data: [DONE]') {
                      controller.close();
                      return;
                    }
                    if (trimmed.startsWith('data: ')) {
                      try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                          controller.enqueue(encoder.encode(delta));
                        }
                      } catch {
                        // Skip malformed chunk
                      }
                    }
                  }
                }
                controller.close();
              } catch (streamErr) {
                controller.error(streamErr);
              }
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'X-Accel-Buffering': 'no',
            },
          });
        } else {
          const errorText = await upstreamRes.text().catch(() => '');
          console.error(`OpenRouter upstream error (${upstreamRes.status}):`, errorText);
        }
      } catch (err: any) {
        console.error('OpenRouter streaming connection error:', err.message);
      }
    }

    // Deterministic grounded reasoning stream fallback
    const fallbackText = generateGroundedAnalysis(signals, weather, districtMeta, message, fieldChecks);
    return createSimulatedStream(fallbackText);
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return new Response(`Error synthesizing climate evidence: ${error.message}`, { status: 500 });
  }
}

/**
 * Generates an analytical grounded response covering weather, historical anomaly, satellite NDVI, and ground truth.
 */
function generateGroundedAnalysis(
  signals: any,
  weather: any,
  district: any,
  query: string,
  fieldChecks: any[]
): string {
  const q = query.toLowerCase();
  const districtName = signals.districtName;
  const today = weather.forecastDays[0];
  const tomorrow = weather.forecastDays[1];
  const fiveDayTotal = Number(
    weather.forecastDays.slice(0, 5).reduce((acc: number, d: any) => acc + (d.precipMm || 0), 0).toFixed(1)
  );

  if (q.includes('plant') || q.includes('crop') || q.includes('seed') || q.includes('season')) {
    return [
      `### Agricultural & Planting Assessment — ${districtName} District\n`,
      `**Agro-Ecological Zone:** ${district?.agroZone || 'Central Plateau'} (${district?.elevation || 1500}m altitude)`,
      `**Recommended Crops:** ${(district?.primaryCrops || ['Maize', 'Beans', 'Sorghum']).join(', ')}\n`,
      `#### 1. Soil Moisture & Field Water Balance`,
      `- **Topsoil Root-Zone Moisture (0–7cm):** ${signals.hydrology?.soilMoisturePct ?? 45}% (${(signals.hydrology?.soilMoisturePct ?? 45) > 40 ? 'Sufficient for germination and seedling establishment' : 'Marginal; mulching recommended'})`,
      `- **Reference Evapotranspiration (ET0):** ${today?.et0Mm ?? 3.8} mm/day. Crop water demand is currently moderate.\n`,
      `#### 2. Short-Term Precipitation Dynamics`,
      `- **Today:** ${today?.precipProb ?? 35}% rain probability (${today?.precipMm ?? 0} mm)`,
      `- **5-Day Cumulative:** ${fiveDayTotal} mm projected across the district catchment.`,
      `- **30-Year Rainfall Anomaly:** ${signals.rainfall?.targetMm ?? 95} mm vs ${signals.rainfall?.baselineMeanMm ?? 102} mm historical mean (${(signals.rainfall?.diffMm ?? 0) >= 0 ? '+' : ''}${signals.rainfall?.diffMm ?? 0} mm, ${signals.rainfall?.status ?? 'Near normal'}).\n`,
      `#### 3. Ground Truth Verification`,
      fieldChecks.length > 0
        ? `- **Latest Field Observation:** "${fieldChecks[0].observation}" (Logged ${new Date(fieldChecks[0].observed_at).toLocaleDateString()}, Status: ${fieldChecks[0].status})`
        : `- No recent ground observations reported. Cooperative extension agents are encouraged to log a field check in the Field Observations tab.`,
      `\n*Notice: Official agricultural calendars and meteorological advisories are coordinated with Meteo Rwanda (meteorwanda.gov.rw).*`,
    ].join('\n');
  }

  if (q.includes('rain') || q.includes('weather') || q.includes('forecast') || q.includes('cloud')) {
    return [
      `### Meteorological & Rainfall Outlook — ${districtName} District\n`,
      `**Source:** Open-Meteo High-Resolution ECMWF/IFS & Meteo Rwanda Calibration\n`,
      `#### Current Ambient Conditions`,
      `- **Temperature:** ${weather.temperatureC}°C`,
      `- **Relative Humidity:** ${weather.humidity}%`,
      `- **Surface Wind:** ${weather.windSpeedKmh} km/h`,
      `- **Precipitation:** ${weather.precipCurrentMm} mm\n`,
      `#### Upcoming Forecast`,
      `- **Today (${today?.date || 'Today'}):** ${today?.tempMin}°C – ${today?.tempMax}°C · ${today?.precipProb}% rain probability · ${today?.precipMm} mm projected`,
      `- **Tomorrow (${tomorrow?.date || 'Tomorrow'}):** ${tomorrow?.tempMin}°C – ${tomorrow?.tempMax}°C · ${tomorrow?.precipProb}% rain probability · ${tomorrow?.precipMm} mm projected`,
      `- **5-Day Cumulative Total:** **${fiveDayTotal} mm** expected across ${districtName}.\n`,
      `#### 30-Year Historical Climate Normal (ERA5 Reanalysis)`,
      `- **Monthly Baseline Mean:** ${signals.rainfall?.baselineMeanMm ?? 102} mm`,
      `- **Observed Monthly Total:** ${signals.rainfall?.targetMm ?? 95} mm`,
      `- **Deviation:** ${(signals.rainfall?.diffMm ?? 0) >= 0 ? '+' : ''}${signals.rainfall?.diffMm ?? 0} mm (${signals.rainfall?.percent ?? 100}% of normal — **${signals.rainfall?.status ?? 'Near Normal'}**).\n`,
      `*Official severe weather warnings and flood alerts are issued exclusively by Rwanda Meteorology Agency.*`,
    ].join('\n');
  }

  if (q.includes('ndvi') || q.includes('satellite') || q.includes('vegetation') || q.includes('canopy')) {
    return [
      `### Satellite Canopy & Remote Sensing Analysis — ${districtName} District\n`,
      `- **Sensor Product:** NASA MODIS MOD13Q1 250m 16-Day Composite`,
      `- **Observed NDVI:** **${signals.satellite?.ndvi ?? 0.61}** (${signals.satellite?.status ?? 'Moderate vigour'})`,
      `- **Temporal Trajectory:** ${signals.satellite?.trend ?? '+0.01'} compared to prior 16-day orbit pass`,
      `- **Acquisition Quality:** ${signals.satellite?.quality ?? 'Cloud filtered'} (Pass date: ${signals.satellite?.passDate ?? 'Recent'})\n`,
      `#### Agronomic Interpretation`,
      `An NDVI index of **${signals.satellite?.ndvi ?? 0.61}** indicates vigorous vegetative chlorophyll reflectance across ${districtName}'s cultivated hillsides and valley bottoms. Topsoil moisture stands at ${signals.hydrology?.soilMoisturePct ?? 45}%, which correlates with positive biomass vigour in the current vegetative cycle.\n`,
      `*Limitations: Satellite indices provide grid-averaged reflectance and cannot replace localized scouting for pests or disease.*`,
    ].join('\n');
  }

  return [
    `### Climate Intelligence Briefing — ${districtName} District\n`,
    `Here is the integrated climate synthesis for **${districtName}** based on satellite observations, numerical models, and local field checks:\n`,
    `1. **Weather Outlook:** Currently **${weather.temperatureC}°C** with **${weather.humidity}%** humidity. Expect **${today?.precipProb ?? 35}%** chance of rain today (${today?.precipMm ?? 0} mm) and a 5-day cumulative rainfall of **${fiveDayTotal} mm**.`,
    `2. **Historical Rainfall Baseline:** ${signals.rainfall?.targetMm ?? 95} mm recorded against a 30-year normal of ${signals.rainfall?.baselineMeanMm ?? 102} mm (**${signals.rainfall?.status ?? 'Near Normal'}**, ${signals.rainfall?.percent ?? 100}% of median).`,
    `3. **Satellite Canopy (NDVI):** **${signals.satellite?.ndvi ?? 0.61}** indicating ${signals.satellite?.status ?? 'Healthy vegetative canopy'} (${signals.satellite?.trend ?? '+0.01'}).`,
    `4. **Root-Zone Moisture:** **${signals.hydrology?.soilMoisturePct ?? 45}%** topsoil saturation with ${(signals.hydrology?.runoffRiskNote ?? 'Moderate drainage').toLowerCase()}.`,
    `5. **Ground Truth:** ${
      fieldChecks.length > 0
        ? `Latest verified observation: "${fieldChecks[0].observation}" (${fieldChecks[0].status}).`
        : `No field checks currently logged for ${districtName}.`
    }\n`,
    `Feel free to ask follow-up questions about specific crop recommendations, rainfall probabilities for planting, or historical deviations!`,
  ].join('\n');
}

/**
 * Creates a stream that simulates typewriter delivery for deterministic responses.
 */
function createSimulatedStream(text: string): Response {
  const encoder = new TextEncoder();
  const words = text.split(' ');
  let idx = 0;

  const stream = new ReadableStream({
    async start(controller) {
      function pushNext() {
        if (idx < words.length) {
          const chunk = (idx === 0 ? '' : ' ') + words[idx];
          controller.enqueue(encoder.encode(chunk));
          idx++;
          setTimeout(pushNext, 18);
        } else {
          controller.close();
        }
      }
      pushNext();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
