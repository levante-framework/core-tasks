/**
 * Open-Meteo coarse weather lookup (temperature, humidity, elevation, …).
 *
 * Ported from levante-web-dashboard `public/js/locate-me-v2.js` (`fetchCoarseWeather`
 * and helpers), with elevation included from the forecast response top-level
 * `elevation` field (same as the geo-strategy gallery).
 *
 * Privacy model:
 * - Callers should pass a coarse query point (ADM2 bbox center, nearest-city
 *   center, or aggressively rounded GPS) — never precise GPS as the network
 *   query without rounding.
 * - This module further rounds the query point (~0.25°) before calling
 *   Open-Meteo and caches results in localStorage (~45 min).
 *
 * Open-Meteo is called directly (no server proxy / token). Attribution: CC BY 4.0,
 * https://open-meteo.com/
 */

const WEATHER_ROUNDING_DEG = 0.25;
const WEATHER_CACHE_TTL_MS = 45 * 60 * 1000;
const DEFAULT_OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'cloud_cover',
].join(',');

/** Open-Meteo WMO weather interpretation codes. */
const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm (hail)',
  99: 'Thunderstorm (heavy hail)',
};

export type CoarseWeatherBasis = 'adm2_bbox_center' | 'nearest_city_center' | 'gps_rounded_1deg' | string;

export type CoarseWeatherQueryPoint = {
  lat: number;
  lon: number;
  basis: CoarseWeatherBasis;
};

export type CoarseWeatherLookupInput = CoarseWeatherQueryPoint & {
  /** Optional cache-key context (ISO country / admin1 labels). */
  country?: string | null;
  admin1?: string | null;
};

export type CoarseWeatherResult = {
  source: 'open-meteo';
  temperature: number;
  humidity: number | null;
  heatIndexC: number | null;
  cloudCover: number | null;
  windKph: number;
  weathercode: number;
  description: string;
  observedAt: string | null;
  /** Model elevation at the query point (metres), from Open-Meteo response. */
  elevationM: number | null;
  coarse: {
    basis: CoarseWeatherBasis;
    roundingDeg: number;
    queryLat: number;
    queryLon: number;
    country: string | null;
    admin1: string | null;
  };
};

export type OpenMeteoLookupConfig = {
  /** Override Open-Meteo forecast endpoint. Defaults to the public API. */
  openMeteoForecastUrl?: string;
  /** Rounding step in degrees before the network call. Defaults to 0.25. */
  roundingDeg?: number;
};

type CachedWeather = {
  expiresAt?: number;
  fetchedAt?: number;
  weather?: CoarseWeatherResult;
};

type OpenMeteoForecastResponse = {
  elevation?: number;
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    cloud_cover?: number;
    time?: string;
  };
};

type GeoBBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export function roundToStep(value: number, step: number): number {
  const n = Number(value);
  const s = Number(step);
  if (!Number.isFinite(n) || !Number.isFinite(s) || s <= 0) return n;
  return Math.round(n / s) * s;
}

export function weatherCodeDescription(code: number): string {
  const c = Number(code);
  if (!Number.isFinite(c)) return 'Unknown';
  return WEATHER_CODE_DESCRIPTIONS[c] || 'Unknown';
}

/**
 * NWS heat index (°C) from dry-bulb °C and relative humidity %.
 * Uses the Steadman approximation below 80°F, Rothfusz regression above.
 */
export function computeHeatIndexC(tempC: number, relativeHumidity: number): number | null {
  const T = Number(tempC);
  const RH = Number(relativeHumidity);
  if (!Number.isFinite(T) || !Number.isFinite(RH)) return null;
  if (RH < 0 || RH > 100) return null;

  const Tf = (T * 9) / 5 + 32;
  let HI = 0.5 * (Tf + 61.0 + (Tf - 68.0) * 1.2 + RH * 0.094);
  HI = (HI + Tf) / 2;

  if (HI >= 80) {
    HI =
      -42.379 +
      2.04901523 * Tf +
      10.14333127 * RH -
      0.22475541 * Tf * RH -
      0.00683783 * Tf * Tf -
      0.05481717 * RH * RH +
      0.00122874 * Tf * Tf * RH +
      0.00085282 * Tf * RH * RH -
      0.00000199 * Tf * Tf * RH * RH;

    if (RH < 13 && Tf >= 80 && Tf <= 112) {
      HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(Tf - 95)) / 17);
    } else if (RH > 85 && Tf >= 80 && Tf <= 87) {
      HI += ((RH - 85) / 10) * ((87 - Tf) / 5);
    }
  }

  const hic = ((HI - 32) * 5) / 9;
  return Math.round(hic * 10) / 10;
}

/** Returns { minLon, minLat, maxLon, maxLat } for a GeoJSON Feature or Geometry, or null. */
export function bboxFromGeoJSON(obj: any): GeoBBox | null {
  const geom = obj?.type === 'Feature' ? obj.geometry : obj;
  const coords = geom?.coordinates;
  if (!geom || !coords) return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const walk = (c: any) => {
    if (!c) return;
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      const lon = Number(c[0]);
      const lat = Number(c[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    if (Array.isArray(c)) c.forEach(walk);
  };
  walk(coords);
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
    return null;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Prefer ADM2 bbox center (regional, coarse). Fall back to nearest-city center,
 * then GPS rounded to 1°. Mirrors locate-me-v2 `pickCoarseWeatherQueryPoint`.
 */
export function pickCoarseWeatherQueryPoint(options: {
  adm2GeoJson?: any | null;
  nearestCity?: { lat?: number; lon?: number } | null;
  gps?: { lat?: number; lon?: number } | null;
}): CoarseWeatherQueryPoint | null {
  const bbox = options.adm2GeoJson ? bboxFromGeoJSON(options.adm2GeoJson) : null;
  if (bbox) {
    return {
      lat: (bbox.minLat + bbox.maxLat) / 2,
      lon: (bbox.minLon + bbox.maxLon) / 2,
      basis: 'adm2_bbox_center',
    };
  }

  const cityLat = Number(options.nearestCity?.lat);
  const cityLon = Number(options.nearestCity?.lon);
  if (Number.isFinite(cityLat) && Number.isFinite(cityLon)) {
    return { lat: cityLat, lon: cityLon, basis: 'nearest_city_center' };
  }

  // Last resort: do not use precise GPS; round it aggressively if present.
  const gpsLat = Number(options.gps?.lat);
  const gpsLon = Number(options.gps?.lon);
  if (Number.isFinite(gpsLat) && Number.isFinite(gpsLon)) {
    return {
      lat: roundToStep(gpsLat, 1.0),
      lon: roundToStep(gpsLon, 1.0),
      basis: 'gps_rounded_1deg',
    };
  }

  return null;
}

function weatherCacheKey(
  country: string | null | undefined,
  admin1: string | null | undefined,
  roundedLat: number,
  roundedLon: number,
): string {
  const c = (country || '').toString().trim().toUpperCase() || 'XX';
  const a1 = (admin1 || '').toString().trim().toUpperCase() || 'NA';
  // v2: includes humidity / heat index / cloud cover from Open-Meteo `current=`
  return `wx:v2:${c}:${a1}:${roundedLat.toFixed(2)}:${roundedLon.toFixed(2)}`;
}

function readWeatherCache(key: string): CachedWeather | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (!parsed || typeof parsed !== 'object') return null;
    const exp = Number(parsed.expiresAt || 0);
    if (exp && Date.now() > exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeWeatherCache(key: string, payload: CachedWeather): void {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private mode / quota); ignore.
  }
}

/**
 * Privacy-preserving weather lookup via Open-Meteo.
 *
 * Pass a coarse query point (see `pickCoarseWeatherQueryPoint`). Coordinates are
 * rounded further before the network call. Returns temperature, humidity, heat
 * index, cloud cover, wind, weather code, and model elevation — or null.
 */
export async function fetchCoarseWeather(
  input: CoarseWeatherLookupInput,
  config?: OpenMeteoLookupConfig | null,
): Promise<CoarseWeatherResult | null> {
  const lat = Number(input?.lat);
  const lon = Number(input?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const country = (input.country || '').toString().trim().toUpperCase() || null;
  const admin1 = (input.admin1 || '').toString().trim() || null;
  const basis = input.basis || 'unknown';

  // Round query point to reduce precision before network call (privacy).
  const step =
    Number.isFinite(Number(config?.roundingDeg)) && Number(config?.roundingDeg) > 0
      ? Number(config?.roundingDeg)
      : WEATHER_ROUNDING_DEG;
  const qLat = roundToStep(lat, step);
  const qLon = roundToStep(lon, step);

  const cacheKey = weatherCacheKey(country, admin1, qLat, qLon);
  const cached = readWeatherCache(cacheKey);
  if (cached?.weather) {
    return cached.weather;
  }

  const forecastUrl = String(config?.openMeteoForecastUrl || DEFAULT_OPEN_METEO_FORECAST_URL).trim();
  const url = `${forecastUrl}?latitude=${encodeURIComponent(String(qLat))}&longitude=${encodeURIComponent(String(qLon))}&current=${encodeURIComponent(CURRENT_VARS)}&timezone=auto`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`weather_fetch_failed_${res.status}`);
  const json = (await res.json()) as OpenMeteoForecastResponse;
  const cw = json?.current || null;
  if (!cw) return null;

  const temperature = Number(cw.temperature_2m);
  const humidity = Number(cw.relative_humidity_2m);
  const weathercode = Number(cw.weather_code);
  const heatIndexC = computeHeatIndexC(temperature, humidity);
  const cloudCover = Number(cw.cloud_cover);
  const elevationM = typeof json?.elevation === 'number' ? json.elevation : null;

  const weather: CoarseWeatherResult = {
    source: 'open-meteo',
    temperature,
    humidity: Number.isFinite(humidity) ? humidity : null,
    heatIndexC: Number.isFinite(heatIndexC as number) ? heatIndexC : null,
    cloudCover: Number.isFinite(cloudCover) ? cloudCover : null,
    windKph: Number(cw.wind_speed_10m),
    weathercode,
    description: weatherCodeDescription(weathercode),
    observedAt: cw.time || null,
    elevationM,
    coarse: {
      basis,
      roundingDeg: step,
      queryLat: qLat,
      queryLon: qLon,
      country,
      admin1,
    },
  };

  writeWeatherCache(cacheKey, {
    expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
    fetchedAt: Date.now(),
    weather,
  });
  return weather;
}
