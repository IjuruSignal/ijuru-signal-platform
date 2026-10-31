// These functions process supplied illustrative samples only. They do not load
// Sentinel-2 or CHIRPS files, perform spatial clipping, or validate data rights.

export interface PixelSample {
  scl: number;
  red: number | null;
  nir: number | null;
}

export interface VegetationAggregateResult {
  fixture: true;
  algorithm: string;
  mean: number | null;
  unit: string;
  validPixels: number;
  totalPixels: number;
  validFraction: number;
}

export interface MonthlyRainfallEntry {
  month: string;
  coverage: number;
  mm: number | null;
}

export interface RainfallComparisonResult {
  fixture: true;
  algorithm: string;
  status: 'available' | 'unavailable';
  targetMonth: string;
  baselineYears: number[];
  unit: string;
  targetMm?: number;
  baselineMeanMm?: number;
  differenceMm?: number;
  missingMonths?: string[];
}

const isFixture = (input: any): void => {
  if (!input || input.fixture !== true) throw new Error('Illustrative fixture required');
};
const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function aggregateVegetationFixture(input: { fixture: boolean; pixels: PixelSample[] }): VegetationAggregateResult {
  isFixture(input);
  if (!Array.isArray(input.pixels) || !input.pixels.length || input.pixels.length > 100000) {
    throw new Error('Invalid pixels');
  }
  let valid = 0,
    sum = 0;
  for (const pixel of input.pixels) {
    if (!pixel || !Number.isInteger(pixel.scl) || pixel.scl < 0 || pixel.scl > 11) {
      throw new Error('Invalid scene classification');
    }
    if (pixel.scl !== 4) continue;
    const { red, nir } = pixel;
    if (red === null || nir === null) continue;
    if (!Number.isFinite(red) || !Number.isFinite(nir) || red < 0 || red > 1 || nir < 0 || nir > 1) {
      throw new Error('Invalid reflectance');
    }
    const denominator = nir + red;
    if (denominator === 0) continue;
    sum += (nir - red) / denominator;
    valid++;
  }
  return {
    fixture: true,
    algorithm: 'fixture-ndvi-scl4-v1',
    mean: valid ? sum / valid : null,
    unit: 'dimensionless',
    validPixels: valid,
    totalPixels: input.pixels.length,
    validFraction: valid / input.pixels.length,
  };
}

export function compareRainfallFixture(input: {
  fixture: boolean;
  targetMonth: string;
  baselineYears: number[];
  months: MonthlyRainfallEntry[];
}): RainfallComparisonResult {
  isFixture(input);
  if (
    !monthPattern.test(input.targetMonth || '') ||
    !Array.isArray(input.baselineYears) ||
    input.baselineYears.length < 2 ||
    input.baselineYears.length > 100 ||
    !Array.isArray(input.months) ||
    input.months.length > 2000
  ) {
    throw new Error('Invalid rainfall request');
  }
  const match = monthPattern.exec(input.targetMonth)!;
  const targetYear = Number(match[1]);
  const month = match[2];
  if (
    targetYear < 1900 ||
    input.baselineYears.some((y) => !Number.isInteger(y) || y < 1900 || y > 9999 || y === targetYear) ||
    new Set(input.baselineYears).size !== input.baselineYears.length
  ) {
    throw new Error('Invalid baseline');
  }
  const values = new Map<string, MonthlyRainfallEntry>();
  for (const entry of input.months) {
    if (
      !entry ||
      !monthPattern.test(entry.month || '') ||
      values.has(entry.month) ||
      !Number.isFinite(entry.coverage) ||
      entry.coverage < 0 ||
      entry.coverage > 1 ||
      (entry.mm !== null && (!Number.isFinite(entry.mm) || (entry.mm as number) < 0))
    ) {
      throw new Error('Invalid monthly rainfall');
    }
    values.set(entry.month, entry);
  }
  const years = [...input.baselineYears].sort((a, b) => a - b);
  const required = [input.targetMonth, ...years.map((y) => `${y}-${month}`)];
  const missing = required.filter((key) => {
    const item = values.get(key);
    return !item || item.mm === null || item.coverage !== 1;
  });
  if (missing.length) {
    return {
      fixture: true,
      algorithm: 'fixture-monthly-baseline-v1',
      status: 'unavailable',
      targetMonth: input.targetMonth,
      baselineYears: years,
      missingMonths: missing,
      unit: 'mm',
    };
  }
  const targetMm = values.get(input.targetMonth)!.mm!;
  const baselineMeanMm = years.reduce((sum, year) => sum + values.get(`${year}-${month}`)!.mm! / years.length, 0);
  if (!Number.isFinite(baselineMeanMm) || !Number.isFinite(targetMm - baselineMeanMm)) {
    throw new Error('Rainfall calculation out of range');
  }
  return {
    fixture: true,
    algorithm: 'fixture-monthly-baseline-v1',
    status: 'available',
    targetMonth: input.targetMonth,
    baselineYears: years,
    targetMm,
    baselineMeanMm,
    differenceMm: targetMm - baselineMeanMm,
    unit: 'mm',
  };
}
