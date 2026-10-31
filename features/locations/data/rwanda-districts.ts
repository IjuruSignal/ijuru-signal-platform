/**
 * Authoritative Rwanda District Metadata.
 * Covers all 30 districts from NISR / National Administrative Boundaries,
 * plus the Kigali central urban hub.
 */

export type RwandaProvince =
  | 'Kigali City'
  | 'Eastern Province'
  | 'Northern Province'
  | 'Western Province'
  | 'Southern Province';

export interface DistrictMetadata {
  id: string;
  name: string;
  province: RwandaProvince;
  lat: number;
  lon: number;
  elevation: number;
  agroZone: string;
  featured: boolean;
  primaryCrops: string[];
}

export const RWANDA_DISTRICTS: DistrictMetadata[] = [
  // 1. Kigali Urban Core Hub (Featured)
  {
    id: 'kigali',
    name: 'Kigali',
    province: 'Kigali City',
    lat: -1.9501,
    lon: 30.0589,
    elevation: 1567,
    agroZone: 'Central Plateau & Urban Catchment',
    featured: true,
    primaryCrops: ['Horticulture', 'Maize', 'Beans', 'Agroforestry'],
  },
  // 2. Gasabo (Kigali City)
  {
    id: 'gasabo',
    name: 'Gasabo',
    province: 'Kigali City',
    lat: -1.8879,
    lon: 30.119,
    elevation: 1590,
    agroZone: 'Kigali Northern Hills & Peri-Urban',
    featured: false,
    primaryCrops: ['Horticulture', 'Vegetables', 'Maize', 'Beans'],
  },
  // 3. Nyarugenge (Kigali City)
  {
    id: 'nyarugenge',
    name: 'Nyarugenge',
    province: 'Kigali City',
    lat: -1.9977,
    lon: 30.022,
    elevation: 1520,
    agroZone: 'Nyabarongo Valley & Urban Core',
    featured: false,
    primaryCrops: ['Horticulture', 'Maize', 'Cassava', 'Beans'],
  },
  // 4. Kicukiro (Kigali City)
  {
    id: 'kicukiro',
    name: 'Kicukiro',
    province: 'Kigali City',
    lat: -2.0297,
    lon: 30.1413,
    elevation: 1550,
    agroZone: 'Kigali South-East Peri-Urban',
    featured: false,
    primaryCrops: ['Horticulture', 'Vegetables', 'Poultry & Fodder', 'Maize'],
  },
  // 5. Bugesera (Eastern Province - Featured)
  {
    id: 'bugesera',
    name: 'Bugesera',
    province: 'Eastern Province',
    lat: -2.1734,
    lon: 30.1726,
    elevation: 1350,
    agroZone: 'Eastern Plateau & Dry Savannah',
    featured: true,
    primaryCrops: ['Cassava', 'Maize', 'Beans', 'Sorghum'],
  },
  // 6. Musanze (Northern Province - Featured)
  {
    id: 'musanze',
    name: 'Musanze',
    province: 'Northern Province',
    lat: -1.5134,
    lon: 29.631,
    elevation: 1850,
    agroZone: 'Volcanic Highlands (Birunga)',
    featured: true,
    primaryCrops: ['Irish Potatoes', 'Pyrethrum', 'Maize', 'Vegetables'],
  },
  // 7. Rubavu (Western Province - Featured)
  {
    id: 'rubavu',
    name: 'Rubavu',
    province: 'Western Province',
    lat: -1.6829,
    lon: 29.3625,
    elevation: 1475,
    agroZone: 'Lake Kivu Shore & Volcanic Foot',
    featured: true,
    primaryCrops: ['Vegetables', 'Maize', 'Coffee', 'Bananas'],
  },
  // 8. Nyagatare (Eastern Province - Featured)
  {
    id: 'nyagatare',
    name: 'Nyagatare',
    province: 'Eastern Province',
    lat: -1.2955,
    lon: 30.3303,
    elevation: 1420,
    agroZone: 'Eastern Savannah & Cattle Corridor',
    featured: true,
    primaryCrops: ['Maize', 'Beans', 'Sorghum', 'Fodder'],
  },
  // 9. Huye (Southern Province - Featured)
  {
    id: 'huye',
    name: 'Huye',
    province: 'Southern Province',
    lat: -2.5186,
    lon: 29.7034,
    elevation: 1720,
    agroZone: 'Southern Central Plateau',
    featured: true,
    primaryCrops: ['Coffee', 'Cassava', 'Maize', 'Beans'],
  },
  // 10. Karongi (Western Province - Featured)
  {
    id: 'karongi',
    name: 'Karongi',
    province: 'Western Province',
    lat: -2.1669,
    lon: 29.4665,
    elevation: 1520,
    agroZone: 'Lake Kivu Shore & Terraced Slopes',
    featured: true,
    primaryCrops: ['Coffee', 'Tea', 'Cassava', 'Bananas'],
  },
  // 11. Kayonza (Eastern Province - Featured)
  {
    id: 'kayonza',
    name: 'Kayonza',
    province: 'Eastern Province',
    lat: -1.9541,
    lon: 30.5903,
    elevation: 1410,
    agroZone: 'Akagera Basin & Eastern Lowlands',
    featured: true,
    primaryCrops: ['Maize', 'Beans', 'Bananas', 'Soybeans'],
  },
  // 12. Rusizi (Western Province)
  {
    id: 'rusizi',
    name: 'Rusizi',
    province: 'Western Province',
    lat: -2.5759,
    lon: 29.1192,
    elevation: 1380,
    agroZone: 'Bugarama Valley & Lake Kivu Basin',
    featured: false,
    primaryCrops: ['Rice', 'Coffee', 'Tea', 'Cassava'],
  },
  // 13. Gicumbi (Northern Province)
  {
    id: 'gicumbi',
    name: 'Gicumbi',
    province: 'Northern Province',
    lat: -1.6023,
    lon: 30.091,
    elevation: 2100,
    agroZone: 'Buberuka Highlands & High Plateau',
    featured: false,
    primaryCrops: ['Tea', 'Irish Potatoes', 'Beans', 'Wheat'],
  },
  // 14. Rwamagana (Eastern Province)
  {
    id: 'rwamagana',
    name: 'Rwamagana',
    province: 'Eastern Province',
    lat: -1.9819,
    lon: 30.3297,
    elevation: 1510,
    agroZone: 'Central Eastern Plateau & Lake Muhazi',
    featured: false,
    primaryCrops: ['Bananas', 'Maize', 'Coffee', 'Beans'],
  },
  // 15. Kirehe (Eastern Province)
  {
    id: 'kirehe',
    name: 'Kirehe',
    province: 'Eastern Province',
    lat: -2.2368,
    lon: 30.6972,
    elevation: 1390,
    agroZone: 'Akagera Valley & Eastern Dry Zone',
    featured: false,
    primaryCrops: ['Bananas', 'Maize', 'Beans', 'Cassava'],
  },
  // 16. Ngoma (Eastern Province)
  {
    id: 'ngoma',
    name: 'Ngoma',
    province: 'Eastern Province',
    lat: -2.2045,
    lon: 30.439,
    elevation: 1470,
    agroZone: 'South-Eastern Hills & Lake Mugesera',
    featured: false,
    primaryCrops: ['Bananas', 'Beans', 'Maize', 'Rice'],
  },
  // 17. Gatsibo (Eastern Province)
  {
    id: 'gatsibo',
    name: 'Gatsibo',
    province: 'Eastern Province',
    lat: -1.6126,
    lon: 30.3387,
    elevation: 1480,
    agroZone: 'Eastern Savannah & High Plains',
    featured: false,
    primaryCrops: ['Maize', 'Beans', 'Bananas', 'Coffee'],
  },
  // 18. Burera (Northern Province)
  {
    id: 'burera',
    name: 'Burera',
    province: 'Northern Province',
    lat: -1.4811,
    lon: 29.8543,
    elevation: 1920,
    agroZone: 'Northern Highland Escarpment',
    featured: false,
    primaryCrops: ['Irish Potatoes', 'Wheat', 'Beans', 'Maize'],
  },
  // 19. Gakenke (Northern Province)
  {
    id: 'gakenke',
    name: 'Gakenke',
    province: 'Northern Province',
    lat: -1.6974,
    lon: 29.7774,
    elevation: 1750,
    agroZone: 'Northern Central Ridge & Terraces',
    featured: false,
    primaryCrops: ['Coffee', 'Bananas', 'Beans', 'Maize'],
  },
  // 20. Rulindo (Northern Province)
  {
    id: 'rulindo',
    name: 'Rulindo',
    province: 'Northern Province',
    lat: -1.7482,
    lon: 29.9844,
    elevation: 1800,
    agroZone: 'Northern Highlands & Mining Belt',
    featured: false,
    primaryCrops: ['Coffee', 'Tea', 'Maize', 'Bananas'],
  },
  // 21. Nyabihu (Western Province)
  {
    id: 'nyabihu',
    name: 'Nyabihu',
    province: 'Western Province',
    lat: -1.6687,
    lon: 29.5115,
    elevation: 2150,
    agroZone: 'Highland Volcanic Plateau',
    featured: false,
    primaryCrops: ['Tea', 'Irish Potatoes', 'Pyrethrum', 'Vegetables'],
  },
  // 22. Rutsiro (Western Province)
  {
    id: 'rutsiro',
    name: 'Rutsiro',
    province: 'Western Province',
    lat: -1.9116,
    lon: 29.4399,
    elevation: 1900,
    agroZone: 'Congo-Nile Divide & Lake Foothills',
    featured: false,
    primaryCrops: ['Tea', 'Coffee', 'Bananas', 'Cassava'],
  },
  // 23. Ngororero (Western Province)
  {
    id: 'ngororero',
    name: 'Ngororero',
    province: 'Western Province',
    lat: -1.893,
    lon: 29.5611,
    elevation: 1680,
    agroZone: 'Congo-Nile Ridge Catchment',
    featured: false,
    primaryCrops: ['Coffee', 'Tea', 'Beans', 'Maize'],
  },
  // 24. Nyamasheke (Western Province)
  {
    id: 'nyamasheke',
    name: 'Nyamasheke',
    province: 'Western Province',
    lat: -2.4116,
    lon: 29.1805,
    elevation: 1600,
    agroZone: 'South-West Lake Kivu Coast',
    featured: false,
    primaryCrops: ['Tea', 'Coffee', 'Bananas', 'Cassava'],
  },
  // 25. Muhanga (Southern Province)
  {
    id: 'muhanga',
    name: 'Muhanga',
    province: 'Southern Province',
    lat: -1.9764,
    lon: 29.7144,
    elevation: 1780,
    agroZone: 'Central Granitic Ridge & Valleys',
    featured: false,
    primaryCrops: ['Coffee', 'Beans', 'Maize', 'Cassava'],
  },
  // 26. Kamonyi (Southern Province)
  {
    id: 'kamonyi',
    name: 'Kamonyi',
    province: 'Southern Province',
    lat: -2.0052,
    lon: 29.9139,
    elevation: 1580,
    agroZone: 'Nyabarongo River Catchment',
    featured: false,
    primaryCrops: ['Coffee', 'Cassava', 'Vegetables', 'Maize'],
  },
  // 27. Ruhango (Southern Province)
  {
    id: 'ruhango',
    name: 'Ruhango',
    province: 'Southern Province',
    lat: -2.1897,
    lon: 29.7294,
    elevation: 1650,
    agroZone: 'Southern Terraced Plateaus',
    featured: false,
    primaryCrops: ['Cassava', 'Coffee', 'Maize', 'Beans'],
  },
  // 28. Nyanza (Southern Province)
  {
    id: 'nyanza',
    name: 'Nyanza',
    province: 'Southern Province',
    lat: -2.3203,
    lon: 29.7702,
    elevation: 1700,
    agroZone: 'Royal Heartland & Central Hills',
    featured: false,
    primaryCrops: ['Cassava', 'Maize', 'Beans', 'Coffee'],
  },
  // 29. Gisagara (Southern Province)
  {
    id: 'gisagara',
    name: 'Gisagara',
    province: 'Southern Province',
    lat: -2.6446,
    lon: 29.8371,
    elevation: 1620,
    agroZone: 'Southern Border Lowlands & Valleys',
    featured: false,
    primaryCrops: ['Rice', 'Cassava', 'Beans', 'Maize'],
  },
  // 30. Nyamagabe (Southern Province)
  {
    id: 'nyamagabe',
    name: 'Nyamagabe',
    province: 'Southern Province',
    lat: -2.3994,
    lon: 29.4701,
    elevation: 1950,
    agroZone: 'Congo-Nile Divide & Forest Buffer',
    featured: false,
    primaryCrops: ['Tea', 'Coffee', 'Wheat', 'Irish Potatoes'],
  },
  // 31. Nyaruguru (Southern Province)
  {
    id: 'nyaruguru',
    name: 'Nyaruguru',
    province: 'Southern Province',
    lat: -2.6934,
    lon: 29.5077,
    elevation: 1980,
    agroZone: 'Nyungwe Border & High Ridge',
    featured: false,
    primaryCrops: ['Tea', 'Wheat', 'Irish Potatoes', 'Beans'],
  },
];

/**
 * Look up a district by ID or name (case-insensitive).
 */
export function findDistrict(idOrName: string): DistrictMetadata | undefined {
  if (!idOrName) return undefined;
  const q = idOrName.toLowerCase().trim();
  return RWANDA_DISTRICTS.find(
    (d) => d.id.toLowerCase() === q || d.name.toLowerCase() === q
  );
}

/**
 * Find the nearest district to a given GPS coordinate using Haversine distance.
 */
export function findNearestDistrict(lat: number, lon: number): DistrictMetadata {
  let nearest = RWANDA_DISTRICTS[0];
  let minDistance = Infinity;

  for (const d of RWANDA_DISTRICTS) {
    const dLat = (d.lat - lat) * (Math.PI / 180);
    const dLon = (d.lon - lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * (Math.PI / 180)) *
        Math.cos(d.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c;

    if (dist < minDistance) {
      minDistance = dist;
      nearest = d;
    }
  }

  return nearest;
}
