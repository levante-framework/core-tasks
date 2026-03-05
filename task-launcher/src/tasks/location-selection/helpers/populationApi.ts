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
    if (!response.ok) return { population: null, source: 'unknown' };
    const payload = await response.json().catch(() => ({}));
    const resolvedSourceRaw = String(payload?.source || '').trim().toLowerCase();
    const resolvedSource: PopulationSource | 'unknown' =
      resolvedSourceRaw === 'kontur' || resolvedSourceRaw === 'worldpop'
        ? resolvedSourceRaw
        : source;
    return { population: parsePopulation(payload), source: resolvedSource };
  } catch {
    return { population: null, source: 'unknown' };
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

  for (let i = 0; i < orderedSources.length; i += 1) {
    const source = orderedSources[i];
    const endpoint = source === 'kontur' ? konturUrl : worldpopUrl;
    const result = await fetchPopulation(endpoint, source, cellId, resolution, timeoutMs);
    if (typeof result.population === 'number') return result;
  }

  return { population: null, source: 'unknown' };
}
