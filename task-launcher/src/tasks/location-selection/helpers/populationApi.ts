import { cellToBoundary } from 'h3-js';

type PopulationSource = 'kontur' | 'worldpop';

export type PopulationLookupConfig = {
  populationSourcePreference?: 'kontur' | 'worldpop' | 'auto';
  konturPopulationApiUrl?: string;
  worldpopPopulationApiUrl?: string;
  populationApiTimeoutMs?: number;
};

type PopulationLookupResult = {
  population: number | null;
  source: PopulationSource | 'unknown';
};

function parsePopulation(payload: any): number | null {
  const candidates = [
    payload?.data?.total_population,
    payload?.population,
    payload?.pop,
    payload?.estimatedPopulation,
    payload?.data?.population,
    payload?.result?.population,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const n = Number(candidates[i]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function buildCellPolygon(cellId: string) {
  const boundary = cellToBoundary(cellId);
  if (!Array.isArray(boundary) || !boundary.length) return null;
  const ring = boundary.map((pair) => [Number(pair[1]), Number(pair[0])]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return null;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

function parseWorldPopTaskId(payload: any): string | null {
  const candidates = [payload?.taskid, payload?.taskId, payload?.task_id, payload?.id];
  for (let i = 0; i < candidates.length; i += 1) {
    const value = String(candidates[i] || '').trim();
    if (value) return value;
  }
  return null;
}

async function queryWorldPopDirect(cellId: string, timeoutMs: number): Promise<number | null> {
  const polygon = buildCellPolygon(cellId);
  if (!polygon) return null;
  const statsUrl = new URL('https://api.worldpop.org/v1/services/stats');
  statsUrl.searchParams.set('dataset', 'wpgppop');
  statsUrl.searchParams.set('year', '2020');
  statsUrl.searchParams.set('geojson', JSON.stringify(polygon));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), Math.max(timeoutMs, 5000));
  try {
    const statsResponse = await fetch(statsUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
    });
    if (!statsResponse.ok) return null;
    const statsPayload = await statsResponse.json().catch(() => ({}));
    const direct = parsePopulation(statsPayload);
    if (typeof direct === 'number') return direct;

    const taskId = parseWorldPopTaskId(statsPayload);
    if (!taskId) return null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const taskResponse = await fetch(`https://api.worldpop.org/v1/tasks/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!taskResponse.ok) return null;
      const taskPayload = await taskResponse.json().catch(() => ({}));
      const value = parsePopulation(taskPayload);
      if (typeof value === 'number') return value;
      const status = String(taskPayload?.status || '').toLowerCase();
      if (status.includes('failed') || status.includes('error')) return null;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchPopulation(
  endpoint: string,
  source: PopulationSource,
  cellId: string,
  resolution: number,
  timeoutMs: number,
): Promise<PopulationLookupResult> {
  if (!endpoint) return { population: null, source: 'unknown' };

  try {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('cellId', cellId);
    url.searchParams.set('resolution', String(resolution));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!response.ok) {
      const directPopulation = await queryWorldPopDirect(cellId, timeoutMs);
      if (typeof directPopulation === 'number') {
        return { population: directPopulation, source: 'worldpop' };
      }
      return { population: null, source };
    }
    const payload = await response.json().catch(() => ({}));
    const resolvedSourceRaw = String(payload?.source || '').trim().toLowerCase();
    const resolvedSource: PopulationSource | 'unknown' =
      resolvedSourceRaw === 'kontur' || resolvedSourceRaw === 'worldpop'
        ? resolvedSourceRaw
        : source;
    const parsed = parsePopulation(payload);
    if (typeof parsed === 'number') return { population: parsed, source: resolvedSource };
    const directPopulation = await queryWorldPopDirect(cellId, timeoutMs);
    if (typeof directPopulation === 'number') {
      return { population: directPopulation, source: 'worldpop' };
    }
    return { population: null, source: resolvedSource };
  } catch {
    const directPopulation = await queryWorldPopDirect(cellId, timeoutMs);
    if (typeof directPopulation === 'number') {
      return { population: directPopulation, source: 'worldpop' };
    }
    return { population: null, source };
  }
}

export async function lookupPopulationForCell(
  cellId: string,
  resolution: number,
  config: PopulationLookupConfig | null | undefined,
): Promise<PopulationLookupResult> {
  const preference = String(config?.populationSourcePreference || 'auto').toLowerCase();
  const konturUrl = String(config?.konturPopulationApiUrl || '/api/population-kontur-h3');
  const worldpopUrl = String(config?.worldpopPopulationApiUrl || '/api/population-worldpop-h3');
  const timeoutMs = Number(config?.populationApiTimeoutMs) > 0 ? Number(config?.populationApiTimeoutMs) : 2500;

  const orderedSources: PopulationSource[] =
    preference === 'kontur'
      ? ['kontur', 'worldpop']
      : preference === 'worldpop'
        ? ['worldpop', 'kontur']
        : ['kontur', 'worldpop'];

  let attemptedKnownSource: PopulationSource | 'unknown' = 'unknown';
  for (let i = 0; i < orderedSources.length; i += 1) {
    const source = orderedSources[i];
    const endpoint = source === 'kontur' ? konturUrl : worldpopUrl;
    const result = await fetchPopulation(endpoint, source, cellId, resolution, timeoutMs);
    if (result.source !== 'unknown') attemptedKnownSource = result.source;
    if (typeof result.population === 'number') return result;
  }

  return { population: null, source: attemptedKnownSource };
}
