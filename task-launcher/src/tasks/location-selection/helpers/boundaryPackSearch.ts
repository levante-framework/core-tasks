import { getBoundaryPackBaseUrl } from './cloudFunctions';
import type { PlaceMatch } from './placeSearch';

const PACK_LEVELS = ['adm4', 'adm3', 'adm2', 'adm1'] as const;

interface BoundaryFeature {
  properties?: { name?: string };
  geometry?: { type?: string; coordinates?: unknown };
}

interface BoundaryPack {
  features?: BoundaryFeature[];
}

const packCache = new Map<string, BoundaryPack>();

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readGzipJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Boundary pack request failed (${response.status})`);
  }
  const compressed = await response.arrayBuffer();
  const Decoder = (
    globalThis as unknown as {
      DecompressionStream?: new (format: string) => ReadableWritablePair;
    }
  ).DecompressionStream;
  if (!Decoder) {
    throw new Error('This browser cannot read the local boundary pack');
  }
  const decoded = new Response(new Blob([compressed]).stream().pipeThrough(new Decoder('gzip')));
  return decoded.json();
}

async function loadFinestPack(countryCode: string): Promise<BoundaryPack> {
  const code = String(countryCode || '')
    .trim()
    .toLowerCase();
  const cached = packCache.get(code);
  if (cached) return cached;

  let lastError: Error | null = null;
  for (const level of PACK_LEVELS) {
    try {
      const data = (await readGzipJson(`${getBoundaryPackBaseUrl()}/${code}/${level}.json.gz`)) as BoundaryPack;
      if (!data || !Array.isArray(data.features)) {
        throw new Error(`Boundary pack for ${code.toUpperCase()} is unreadable`);
      }
      packCache.set(code, data);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error(`No boundary pack for ${code.toUpperCase()}`);
}

function largestOuterRing(geometry: BoundaryFeature['geometry']): number[][] | null {
  const type = geometry?.type;
  const coordinates = geometry?.coordinates;
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? (coordinates as unknown[]) : [];
  let best: number[][] | null = null;
  for (const polygon of polygons) {
    const outer = Array.isArray(polygon) ? (polygon[0] as number[][]) : null;
    if (!Array.isArray(outer) || outer.length < 3) continue;
    if (!best || outer.length > best.length) best = outer;
  }
  return best;
}

function representativePoint(geometry: BoundaryFeature['geometry']): { lat: number; lon: number } | null {
  const ring = largestOuterRing(geometry);
  if (!ring) return null;
  let lon = 0;
  let lat = 0;
  let count = 0;
  for (const pair of ring) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const pairLon = Number(pair[0]);
    const pairLat = Number(pair[1]);
    if (!Number.isFinite(pairLon) || !Number.isFinite(pairLat)) continue;
    lon += pairLon;
    lat += pairLat;
    count += 1;
  }
  if (!count) return null;
  return { lon: lon / count, lat: lat / count };
}

/** Download the selected country's finest pack before the first keystroke. */
export function preloadBoundaryPack(countryCode: string): void {
  loadFinestPack(countryCode).catch(() => undefined);
}

/** Match an admin-area name in the on-device pack for one country. */
export async function searchAdminAreas(query: string, countryCode: string): Promise<PlaceMatch[]> {
  const queryNorm = normalizeText(query);
  if (!countryCode || queryNorm.length < 2) return [];
  const pack = await loadFinestPack(countryCode);
  const ranked = (pack.features || [])
    .map((feature) => {
      const name = String(feature.properties?.name || '');
      const nameNorm = normalizeText(name);
      if (!nameNorm) return null;
      let score = 0;
      if (nameNorm === queryNorm) score += 120;
      if (nameNorm.startsWith(queryNorm)) score += 100;
      if (nameNorm.includes(queryNorm)) score += 50;
      if (score <= 0) return null;
      const point = representativePoint(feature.geometry);
      if (!point) return null;
      return { name, score, point };
    })
    .filter((row): row is { name: string; score: number; point: { lat: number; lon: number } } => Boolean(row))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 10);

  return ranked.map((row) => ({
    display_name: row.name,
    lat: String(row.point.lat),
    lon: String(row.point.lon),
  }));
}
