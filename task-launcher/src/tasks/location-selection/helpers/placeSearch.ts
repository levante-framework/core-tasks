import { getGeocoderIndexBaseUrl } from './cloudFunctions';

export interface PlaceMatch {
  display_name: string;
  lat: string;
  lon: string;
}

type PlaceEntry = [string, string, string, string, number, number, number];

interface PlaceIndex {
  entries: PlaceEntry[];
  prefix: Record<string, number[]>;
}

interface IndexFileMeta {
  file?: string;
  sha256?: string;
}

interface IndexMeta {
  countries?: Record<string, { files?: { lite?: IndexFileMeta; full?: IndexFileMeta } }>;
}

const indexCache = new Map<string, PlaceIndex>();
let metaPromise: Promise<IndexMeta> | null = null;

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePostal(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isLikelyPostal(value: string): boolean {
  const postal = normalizePostal(value);
  return postal.length >= 2 && /[0-9]/.test(postal);
}

async function readGzipJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Place index request failed (${response.status})`);
  }
  const compressed = await response.arrayBuffer();
  const Decoder = (
    globalThis as unknown as {
      DecompressionStream?: new (format: string) => ReadableWritablePair;
    }
  ).DecompressionStream;
  if (!Decoder) {
    throw new Error('This browser cannot read the local place index');
  }
  const decoded = new Response(new Blob([compressed]).stream().pipeThrough(new Decoder('gzip')));
  return decoded.json();
}

async function loadMeta(): Promise<IndexMeta> {
  if (!metaPromise) {
    metaPromise = fetch(`${getGeocoderIndexBaseUrl()}/meta.json`).then(async (response) => {
      if (!response.ok) throw new Error(`Place index metadata request failed (${response.status})`);
      return (await response.json()) as IndexMeta;
    });
    metaPromise.catch(() => {
      metaPromise = null;
    });
  }
  return metaPromise;
}

/** True when this country has an on-device city and postal index. */
export async function countryHasPlaceIndex(countryCode: string): Promise<boolean> {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (!code) return false;
  try {
    const meta = await loadMeta();
    return Boolean(meta.countries?.[code]?.files?.lite?.file);
  } catch {
    return false;
  }
}

async function loadIndex(countryCode: string, tier: 'lite' | 'full'): Promise<PlaceIndex> {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  const cacheKey = `${code}:${tier}`;
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;

  const meta = await loadMeta();
  const fileMeta = meta.countries?.[code]?.files?.[tier];
  if (!fileMeta?.file) {
    throw new Error(`No local place index for ${code}`);
  }
  const version = String(fileMeta.sha256 || '').slice(0, 16);
  const data = (await readGzipJson(
    `${getGeocoderIndexBaseUrl()}/${fileMeta.file}?v=${encodeURIComponent(version)}`,
  )) as PlaceIndex;
  if (!data || !Array.isArray(data.entries)) {
    throw new Error(`Local place index for ${code} is unreadable`);
  }
  indexCache.set(cacheKey, data);
  return data;
}

function scoreEntry(entry: PlaceEntry, queryNorm: string, postalNorm: string): number {
  const nameNorm = String(entry?.[0] || '');
  const postal = String(entry?.[1] || '').toLowerCase();
  const population = Number(entry?.[6]) || 0;
  let score = 0;
  if (queryNorm) {
    if (nameNorm === queryNorm) score += 120;
    if (nameNorm.startsWith(queryNorm)) score += 100;
    if (nameNorm.includes(queryNorm)) score += 50;
  }
  if (postalNorm) {
    if (postal === postalNorm) score += 140;
    else if (postal?.startsWith(postalNorm)) score += 90;
  }
  score += Math.min(35, Math.log10(Math.max(1, population)) * 7);
  return score;
}

function candidateIds(indexData: PlaceIndex, queryNorm: string, postalNorm: string): number[] {
  const ids = new Set<number>();
  const prefixes: string[] = [];
  if (queryNorm.length >= 2) {
    const compact = queryNorm.replace(/\s+/g, '');
    prefixes.push(queryNorm.slice(0, Math.min(5, queryNorm.length)));
    if (compact && compact !== queryNorm) prefixes.push(compact.slice(0, Math.min(5, compact.length)));
    queryNorm.split(' ').forEach((token) => {
      if (token.length >= 2) prefixes.push(token.slice(0, Math.min(5, token.length)));
    });
  }
  if (postalNorm.length >= 2) prefixes.push(postalNorm.slice(0, Math.min(5, postalNorm.length)));
  prefixes.forEach((prefix) => {
    const bucket = indexData.prefix?.[prefix];
    if (!Array.isArray(bucket)) return;
    for (const id of bucket) ids.add(id);
  });
  return Array.from(ids);
}

function rankIndex(indexData: PlaceIndex, queryNorm: string, postalNorm: string): PlaceEntry[] {
  const ids = candidateIds(indexData, queryNorm, postalNorm);
  let ranked = ids
    .map((id) => {
      const entry = indexData.entries[id];
      if (!entry) return null;
      const score = scoreEntry(entry, queryNorm, postalNorm);
      if (score <= 0) return null;
      return { entry, score };
    })
    .filter((row): row is { entry: PlaceEntry; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (!ranked.length) {
    const scanned: { entry: PlaceEntry; score: number }[] = [];
    for (const entry of indexData.entries) {
      const nameNorm = String(entry?.[0] || '');
      const postal = String(entry?.[1] || '').toLowerCase();
      if (postalNorm) {
        if (!(postal === postalNorm || postal?.startsWith(postalNorm))) continue;
      } else if (queryNorm) {
        const compactName = nameNorm.replace(/\s+/g, '');
        const compactQuery = queryNorm.replace(/\s+/g, '');
        if (!nameNorm.includes(queryNorm) && !(compactQuery && compactName.includes(compactQuery))) continue;
      }
      const score = scoreEntry(entry, queryNorm, postalNorm);
      if (score <= 0) continue;
      scanned.push({ entry, score });
    }
    scanned.sort((a, b) => b.score - a.score);
    ranked = scanned.slice(0, 10);
  }

  return ranked.map((row) => row.entry);
}

function toMatch(entry: PlaceEntry): PlaceMatch | null {
  const lat = Number(entry[4]);
  const lon = Number(entry[5]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = String(entry[2] || '');
  const admin1 = String(entry[3] || '');
  const postal = String(entry[1] || '').toUpperCase();
  const label = [name, admin1, postal].filter(Boolean).join(' · ');
  return {
    display_name: label || name,
    lat: String(lat),
    lon: String(lon),
  };
}

async function searchTier(countryCode: string, tier: 'lite' | 'full', queryNorm: string, postalNorm: string) {
  const indexData = await loadIndex(countryCode, tier);
  return rankIndex(indexData, queryNorm, postalNorm)
    .map(toMatch)
    .filter((match): match is PlaceMatch => Boolean(match));
}

/** Download the small country bundle before the first keystroke. The query is not sent. */
export function preloadPlaceIndex(countryCode: string): void {
  loadIndex(countryCode, 'lite').catch(() => undefined);
}

/** Match a city or postal code against the on-device country index. */
export async function searchPlaces(query: string, countryCode: string): Promise<PlaceMatch[]> {
  const queryNorm = normalizeText(query);
  const postalNorm = normalizePostal(query);
  if (!countryCode || (!queryNorm && !postalNorm)) return [];

  let matches = await searchTier(countryCode, 'lite', queryNorm, postalNorm);
  if ((queryNorm.length >= 3 || isLikelyPostal(query)) && matches.length < 5) {
    const fullMatches = await searchTier(countryCode, 'full', queryNorm, postalNorm);
    if (fullMatches.length) matches = fullMatches;
  }
  return matches.slice(0, 10);
}
