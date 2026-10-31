/**
 * Africa's Talking USSD Gateway Engine for Ijuru Signal.
 * Implements GSM-compliant CON/END menu navigation across Rwanda's 5 provinces
 * and 30 districts, serving live precipitation, 30-year anomalies, and soil moisture.
 */

import {
  fetchDistrictWeather,
  getDistrictSignals,
} from '../../observations/services/climate-signals.ts';
import { findDistrict } from '../../locations/data/rwanda-districts.ts';

export interface UssdDistrictItem {
  id: string;
  name: string;
}

export interface UssdProvinceItem {
  id: string;
  name: string;
  nameRw: string;
  districts: UssdDistrictItem[];
}

export const RWANDA_PROVINCES: UssdProvinceItem[] = [
  {
    id: 'kigali',
    name: 'Kigali City',
    nameRw: 'Umujyi wa Kigali',
    districts: [
      { id: 'gasabo', name: 'Gasabo' },
      { id: 'kicukiro', name: 'Kicukiro' },
      { id: 'nyarugenge', name: 'Nyarugenge' },
    ],
  },
  {
    id: 'north',
    name: 'Northern Province',
    nameRw: 'Amajyaruguru',
    districts: [
      { id: 'musanze', name: 'Musanze' },
      { id: 'gicumbi', name: 'Gicumbi' },
      { id: 'burera', name: 'Burera' },
      { id: 'gakenke', name: 'Gakenke' },
      { id: 'rulindo', name: 'Rulindo' },
    ],
  },
  {
    id: 'south',
    name: 'Southern Province',
    nameRw: 'Amajyepfo',
    districts: [
      { id: 'huye', name: 'Huye' },
      { id: 'muhanga', name: 'Muhanga' },
      { id: 'nyanza', name: 'Nyanza' },
      { id: 'kamonyi', name: 'Kamonyi' },
      { id: 'ruhango', name: 'Ruhango' },
      { id: 'nyamagabe', name: 'Nyamagabe' },
      { id: 'nyaruguru', name: 'Nyaruguru' },
      { id: 'gisagara', name: 'Gisagara' },
    ],
  },
  {
    id: 'east',
    name: 'Eastern Province',
    nameRw: 'Iburasirazuba',
    districts: [
      { id: 'bugesera', name: 'Bugesera' },
      { id: 'rwamagana', name: 'Rwamagana' },
      { id: 'kayonza', name: 'Kayonza' },
      { id: 'nyagatare', name: 'Nyagatare' },
      { id: 'gatsibo', name: 'Gatsibo' },
      { id: 'kirehe', name: 'Kirehe' },
      { id: 'ngoma', name: 'Ngoma' },
    ],
  },
  {
    id: 'west',
    name: 'Western Province',
    nameRw: 'Iburengerazuba',
    districts: [
      { id: 'rubavu', name: 'Rubavu' },
      { id: 'karongi', name: 'Karongi' },
      { id: 'rusizi', name: 'Rusizi' },
      { id: 'nyabihu', name: 'Nyabihu' },
      { id: 'rutsiro', name: 'Rutsiro' },
      { id: 'nyamasheke', name: 'Nyamasheke' },
      { id: 'ngororero', name: 'Ngororero' },
    ],
  },
];

export interface UssdSessionParams {
  sessionId?: string;
  serviceCode?: string;
  phoneNumber?: string;
  text?: string;
}

/**
 * Main USSD Handler function.
 * Evaluates the concatenated `text` parameter from Africa's Talking
 * and returns compliant CON or END strings.
 */
export async function handleUssdRequest({
  text = '',
  phoneNumber,
}: UssdSessionParams): Promise<string> {
  const cleanText = text.trim();
  const steps = cleanText ? cleanText.split('*').map((s) => s.trim()) : [];

  // LEVEL 0: Initial Dial -> Select Province
  if (steps.length === 0) {
    return [
      'CON Ijuru Signal (Rwanda Climate)',
      'Hitamo Intara / Select Province:',
      ...RWANDA_PROVINCES.map((p, idx) => `${idx + 1}. ${p.name}`),
    ].join('\n');
  }

  // LEVEL 1: Select District within chosen Province
  const provinceIndex = parseInt(steps[0], 10) - 1;
  const province = RWANDA_PROVINCES[provinceIndex];

  if (!province) {
    return 'END Intara ntiyabonetse / Invalid province selection. Dial again.';
  }

  if (steps.length === 1) {
    return [
      `CON ${province.name}:`,
      'Hitamo Akarere / Select District:',
      ...province.districts.map((d, idx) => `${idx + 1}. ${d.name}`),
    ].join('\n');
  }

  // LEVEL 2: Select Action / Menu for chosen District
  const districtIndex = parseInt(steps[1], 10) - 1;
  const districtSummary = province.districts[districtIndex];

  if (!districtSummary) {
    return 'END Akarere ntikabonetse / Invalid district selection. Dial again.';
  }

  const districtMeta = findDistrict(districtSummary.id);
  const districtName = districtMeta?.name || districtSummary.name;

  if (steps.length === 2) {
    return [
      `CON ${districtName} Climate (${districtMeta?.elevation || 1500}m):`,
      '1. Imvura / Rain Today & Tomorrow',
      '2. Iminsi 5 / 5-Day Rainfall Total',
      '3. Ubuhehere / Soil & Planting',
      '4. Iteganyagihe / Quick Overview',
    ].join('\n');
  }

  // LEVEL 3: Deliver Specific Climate Details
  const actionChoice = steps[2];
  const weather = await fetchDistrictWeather(districtSummary.id);
  const signals = getDistrictSignals(districtSummary.id);

  const today = weather.forecastDays[0];
  const tomorrow = weather.forecastDays[1];
  const fiveDayTotal = Number(
    weather.forecastDays
      .slice(0, 5)
      .reduce((acc, d) => acc + (d.precipMm || 0), 0)
      .toFixed(1)
  );

  switch (actionChoice) {
    case '1': {
      // 1. Rain Today & Tomorrow
      return [
        `END ${districtName} Rain Outlook:`,
        `Today: ${today?.tempMax ?? 24}°C | ${today?.precipProb ?? 30}% Rain (${today?.precipMm ?? 0}mm)`,
        `Tomorrow: ${tomorrow?.tempMax ?? 24}°C | ${tomorrow?.precipProb ?? 40}% Rain (${tomorrow?.precipMm ?? 0}mm)`,
        `Wind: ${weather.windSpeedKmh}km/h | Hum: ${weather.humidity}%`,
        `Meteo Rwanda (meteorwanda.gov.rw)`,
      ].join('\n');
    }

    case '2': {
      // 2. 5-Day Rainfall & Historical Baseline
      const diffSign = (signals.rainfall?.diffMm ?? 0) >= 0 ? '+' : '';
      return [
        `END ${districtName} 5-Day Rainfall:`,
        `5-Day Rain Total: ${fiveDayTotal} mm`,
        `30yr Baseline: ${signals.rainfall?.baselineMeanMm ?? 100}mm (Norm)`,
        `Anomaly: ${diffSign}${signals.rainfall?.diffMm ?? 0}mm (${signals.rainfall?.status ?? 'Near Normal'})`,
        `Meteo Rwanda (meteorwanda.gov.rw)`,
      ].join('\n');
    }

    case '3': {
      // 3. Soil Moisture & Crop Planting
      const soilMoist = signals.hydrology?.soilMoisturePct ?? 45;
      const crops = (districtMeta?.primaryCrops || ['Maize', 'Beans']).slice(0, 3).join(', ');
      return [
        `END ${districtName} Soil & Crops:`,
        `Topsoil Moisture: ${soilMoist}% (${soilMoist > 40 ? 'Sufficient' : 'Low'})`,
        `ET0 Water Demand: ${today?.et0Mm ?? 3.8} mm/day`,
        `Staple Crops: ${crops}`,
        `NDVI Canopy: ${signals.satellite?.ndvi ?? 0.61} (${signals.satellite?.status ?? 'Good'})`,
      ].join('\n');
    }

    case '4':
    default: {
      // 4. Quick Overview (All-in-one summary)
      return [
        `END ${districtName} (${districtMeta?.elevation || 1500}m):`,
        `Today: ${weather.temperatureC}°C, ${today?.precipProb ?? 35}% Rain (${today?.precipMm ?? 0}mm)`,
        `Tomorrow: ${tomorrow?.tempMax ?? 24}°C, ${tomorrow?.precipProb ?? 40}% Rain`,
        `5-Day Total: ${fiveDayTotal}mm | Soil: ${signals.hydrology?.soilMoisturePct ?? 45}%`,
        `Meteo Rwanda`,
      ].join('\n');
    }
  }
}
