/**
 * Air Quality (AQICN / WAQI), privacy-masked client lookup.
 *
 * Ported from levante-web-dashboard `public/js/locate-me-v2.js`.
 *
 * Privacy model:
 * - Raw GPS never leaves the device.
 * - Area requests use a privacy-masked bounding box centered on a shifted
 *   ("faux") location. The device then picks the nearest station to the raw
 *   GPS on-device.
 * - Station enrichment uses only a public WAQI station id (`uid`).
 *
 * The secret WAQI token stays on the server proxy (currently the Vercel
 * endpoint in levante-web-dashboard). This module only calls that proxy.
 */

const AQI_SHIFT_KM = 1;
const AQI_BBOX_KM = 10;
const AQI_CACHE_TTL_MS = 30 * 60 * 1000;
const AQI_AREA_SIZES_KM = [AQI_BBOX_KM, 25, 50];

const AQI_SHIFT_DIRECTIONS = [
  { id: 'N', dx: 0, dy: 1 },
  { id: 'NE', dx: 1, dy: 1 },
  { id: 'E', dx: 1, dy: 0 },
  { id: 'SE', dx: 1, dy: -1 },
  { id: 'S', dx: 0, dy: -1 },
  { id: 'SW', dx: -1, dy: -1 },
  { id: 'W', dx: -1, dy: 0 },
  { id: 'NW', dx: -1, dy: 1 },
];

/** Existing Vercel proxy in levante-web-dashboard (`api/air-quality.js`). */
export const DEFAULT_AIR_QUALITY_API_BASE = 'https://levante-web-dashboard.vercel.app';

export type AirQualityLookupConfig = {
  /** Base URL for the air-quality proxy (no trailing slash). Defaults to the Vercel dashboard. */
  airQualityApiBase?: string;
};

export type AirQualityCategory = {
  label: string;
  color: string;
};

export type AirQualityResult = {
  source: 'aqicn';
  aqi: number;
  category: string;
  color: string;
  dominantPollutant: string | null;
  pollutants: Record<string, number>;
  stationName: string | null;
  distanceKm: number;
  observedAt: string | null;
  privacy: {
    shiftKm: number;
    shiftDirection: string;
    requestedAreaKm: number;
    stationsConsidered: number;
  };
};

type AirQualityStation = {
  uid: number | string;
  lat: number;
  lon: number;
  aqi: number | null;
  name: string | null;
  observedAt: string | null;
};

type BoundsProxyResponse = {
  ok?: boolean;
  stations?: AirQualityStation[];
};

type StationProxyResponse = {
  ok?: boolean;
  station?: {
    aqi?: number;
    dominantPollutant?: string | null;
    pollutants?: Record<string, number>;
    observedAt?: string | null;
  };
};

type CachedAirQuality = {
  expiresAt?: number;
  fetchedAt?: number;
  airQuality?: AirQualityResult;
};

function resolveApiBase(config?: AirQualityLookupConfig | null): string {
  const base = String(config?.airQualityApiBase || DEFAULT_AIR_QUALITY_API_BASE).trim();
  return base.replace(/\/+$/, '') || DEFAULT_AIR_QUALITY_API_BASE;
}

function airQualityApiUrl(path: string, config?: AirQualityLookupConfig | null): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveApiBase(config)}${normalizedPath}`;
}

function readLocalJson(key: string): CachedAirQuality | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAirQuality;
  } catch {
    return null;
  }
}

function writeLocalJson(key: string, value: CachedAirQuality): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable (private mode / quota); ignore.
  }
}

function roundToStep(value: number, step: number): number {
  const n = Number(value);
  const s = Number(step);
  if (!Number.isFinite(n) || !Number.isFinite(s) || s <= 0) return n;
  return Math.round(n / s) * s;
}

/** Small deterministic FNV-1a hash; used only to pick a shift direction. */
function hashStringToInt(str: string): number {
  let h = 0x811c9dc5;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Faux location: shift raw GPS by a fixed distance in a direction that is
 * deterministic per coarse-region + day (stable, but not obvious).
 */
export function shiftLocationForPrivacy(lat: number, lon: number): {
  lat: number;
  lon: number;
  direction: string;
  shiftKm: number;
} {
  const dayKey = new Date().toISOString().slice(0, 10);
  const coarse = `${roundToStep(lat, 0.1).toFixed(1)},${roundToStep(lon, 0.1).toFixed(1)}`;
  const dir = AQI_SHIFT_DIRECTIONS[hashStringToInt(`${coarse}|${dayKey}`) % AQI_SHIFT_DIRECTIONS.length];
  const diag = AQI_SHIFT_KM / Math.sqrt(2);
  const dxKm = dir.dx !== 0 && dir.dy !== 0 ? dir.dx * diag : dir.dx * AQI_SHIFT_KM;
  const dyKm = dir.dx !== 0 && dir.dy !== 0 ? dir.dy * diag : dir.dy * AQI_SHIFT_KM;
  const cos = Math.cos((lat * Math.PI) / 180);
  const newLat = lat + dyKm / 111.0;
  const newLon = lon + (cos ? dxKm / (111.0 * cos) : 0);
  return { lat: newLat, lon: newLon, direction: dir.id, shiftKm: AQI_SHIFT_KM };
}

/** Returns a sizeKm x sizeKm box as bottom-left (1) and top-right (2) corners. */
export function boundingBoxAround(
  lat: number,
  lon: number,
  sizeKm: number,
): { lat1: number; lon1: number; lat2: number; lon2: number } {
  const halfKm = sizeKm / 2;
  const dLat = halfKm / 111.0;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLon = cos ? halfKm / (111.0 * cos) : 0;
  return {
    lat1: lat - dLat,
    lon1: lon - dLon,
    lat2: lat + dLat,
    lon2: lon + dLon,
  };
}

/** Fast equirectangular approximation; good enough for nearest-station ranking. */
export function approxDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const x = toRad(lon2 - lon1) * Math.cos(toRad((lat1 + lat2) / 2));
  const y = toRad(lat2 - lat1);
  return R * Math.sqrt(x * x + y * y);
}

/** US EPA AQI breakpoints (also used by AQICN for the overall index). */
export function airQualityCategory(aqi: number): AirQualityCategory {
  const n = Number(aqi);
  if (!Number.isFinite(n)) return { label: 'Unknown', color: '#94a3b8' };
  if (n <= 50) return { label: 'Good', color: '#16a34a' };
  if (n <= 100) return { label: 'Moderate', color: '#ca8a04' };
  if (n <= 150) return { label: 'Unhealthy for sensitive groups', color: '#ea580c' };
  if (n <= 200) return { label: 'Unhealthy', color: '#dc2626' };
  if (n <= 300) return { label: 'Very unhealthy', color: '#9333ea' };
  return { label: 'Hazardous', color: '#7f1d1d' };
}

function aqiCacheKey(fauxLat: number, fauxLon: number): string {
  const lat = roundToStep(fauxLat, 0.05).toFixed(2);
  const lon = roundToStep(fauxLon, 0.05).toFixed(2);
  return `aqi:v1:${lat}:${lon}`;
}

/**
 * Privacy-masked air quality lookup for a GPS point.
 *
 * @param lat Raw GPS latitude (used only on-device for nearest-station ranking).
 * @param lon Raw GPS longitude (used only on-device for nearest-station ranking).
 * @param config Optional override for the proxy base URL.
 * @returns Stored measurement shape (no station coordinates / raw GPS), or null.
 */
export async function fetchAirQuality(
  lat: number,
  lon: number,
  config?: AirQualityLookupConfig | null,
): Promise<AirQualityResult | null> {
  const gpsLat = Number(lat);
  const gpsLon = Number(lon);
  if (!Number.isFinite(gpsLat) || !Number.isFinite(gpsLon)) return null;

  // 1) Faux location (shifted) so the requested area's center is not the GPS.
  const faux = shiftLocationForPrivacy(gpsLat, gpsLon);

  const cacheKey = aqiCacheKey(faux.lat, faux.lon);
  const cached = readLocalJson(cacheKey);
  if (cached?.expiresAt && Date.now() < cached.expiresAt && cached?.airQuality) {
    return cached.airQuality;
  }

  // 2) Start with a 10km x 10km de-identified area around the faux center.
  //    In sparse/suburban areas no reporting station may fall inside that box,
  //    so progressively expand the requested area. A larger box is even more
  //    de-identified; we still pick the station closest to the raw GPS below.
  let stations: AirQualityStation[] | null = null;
  let usedAreaKm: number = AQI_BBOX_KM;
  for (const sizeKm of AQI_AREA_SIZES_KM) {
    const box = boundingBoxAround(faux.lat, faux.lon, sizeKm);
    const latlng = [box.lat1, box.lon1, box.lat2, box.lon2].map((v) => Number(v).toFixed(5)).join(',');
    const res = await fetch(airQualityApiUrl(`/api/air-quality?latlng=${encodeURIComponent(latlng)}`, config), {
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as BoundsProxyResponse | null;
    if (json && json.ok && Array.isArray(json.stations) && json.stations.length) {
      stations = json.stations;
      usedAreaKm = sizeKm;
      break;
    }
  }
  if (!stations) return null;

  // 3) On-device: pick the station closest to the RAW GPS. Raw GPS never
  //    leaves the device; it is only used here to rank returned stations.
  let nearest: AirQualityStation | null = null;
  let nearestDist = Infinity;
  for (const s of stations) {
    const d = approxDistanceKm(gpsLat, gpsLon, s.lat, s.lon);
    if (Number.isFinite(d) && d < nearestDist) {
      nearestDist = d;
      nearest = s;
    }
  }
  if (!nearest) return null;

  // 4) Enrich the chosen station via its public station id (no GPS involved).
  let aqi = nearest.aqi;
  let dominantPollutant: string | null = null;
  let pollutants: Record<string, number> = {};
  let observedAt: string | null = nearest.observedAt || null;
  try {
    if (nearest.uid != null) {
      const detailRes = await fetch(
        airQualityApiUrl(`/api/air-quality?uid=${encodeURIComponent(String(nearest.uid))}`, config),
        { cache: 'no-store' },
      );
      const detail = (await detailRes.json().catch(() => null)) as StationProxyResponse | null;
      if (detail?.ok && detail.station) {
        dominantPollutant = detail.station.dominantPollutant || null;
        pollutants = detail.station.pollutants || {};
        observedAt = detail.station.observedAt || observedAt;
        if (Number.isFinite(Number(detail.station.aqi))) {
          aqi = Number(detail.station.aqi);
        }
      }
    }
  } catch {
    // Enrichment is best-effort; the bounds AQI value is sufficient.
  }

  const category = airQualityCategory(Number(aqi));
  // Stored measurement: the closest station's reading. We intentionally omit
  // station coordinates (and raw GPS) to avoid re-identifying the location.
  const airQuality: AirQualityResult = {
    source: 'aqicn',
    aqi: Number(aqi),
    category: category.label,
    color: category.color,
    dominantPollutant,
    pollutants,
    stationName: nearest.name || null,
    distanceKm: Math.round(nearestDist * 10) / 10,
    observedAt,
    privacy: {
      shiftKm: faux.shiftKm,
      shiftDirection: faux.direction,
      requestedAreaKm: usedAreaKm,
      stationsConsidered: stations.length,
    },
  };

  writeLocalJson(cacheKey, {
    expiresAt: Date.now() + AQI_CACHE_TTL_MS,
    fetchedAt: Date.now(),
    airQuality,
  });
  return airQuality;
}
