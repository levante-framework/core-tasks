import {
  getDefaultPopulationKonturH3ApiUrl,
  getDefaultPopulationWorldpopH3ApiUrl,
} from './cloudFunctions';

type PopulationSource = 'kontur' | 'worldpop';

export type PopulationLookupConfig = {
  populationSourcePreference?: 'kontur' | 'worldpop' | 'auto';
  konturPopulationApiUrl?: string;
  worldpopPopulationApiUrl?: string;
};

type PopulationLookupResult = {
  population: number | null;
  source: PopulationSource | 'unknown';
};

const POPULATION_LOOKUP_TIMEOUT_MS = 25000;

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

async function fetchPopulation(
  endpoint: string,
  source: PopulationSource,
  cellId: string,
  resolution: number,
): Promise<PopulationLookupResult> {
  if (!endpoint) return { population: null, source: 'unknown' };

  try {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('cellId', cellId);
    url.searchParams.set('resolution', String(resolution));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), POPULATION_LOOKUP_TIMEOUT_MS);
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });
    window.clearTimeout(timeout);

    if (!response.ok) {
      return { population: null, source };
    }

    const payload = await response.json().catch(() => ({}));
    const resolvedSourceRaw = String(payload?.source || '').trim().toLowerCase();
    const resolvedSource: PopulationSource | 'unknown' =
      resolvedSourceRaw === 'kontur' || resolvedSourceRaw === 'worldpop'
        ? resolvedSourceRaw
        : source;
    const parsed = parsePopulation(payload);
    if (typeof parsed === 'number') {
      return { population: parsed, source: resolvedSource };
    }
    return { population: null, source: resolvedSource };
  } catch {
    return { population: null, source };
  }
}

export async function lookupPopulationForCell(
  cellId: string,
  resolution: number,
  config: PopulationLookupConfig | null | undefined,
): Promise<PopulationLookupResult> {
  const preference = String(config?.populationSourcePreference || 'auto').toLowerCase();
  const konturUrl = String(config?.konturPopulationApiUrl || getDefaultPopulationKonturH3ApiUrl());
  const worldpopUrl = String(config?.worldpopPopulationApiUrl || getDefaultPopulationWorldpopH3ApiUrl());

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
    const result = await fetchPopulation(endpoint, source, cellId, resolution);
    if (result.source !== 'unknown') attemptedKnownSource = result.source;
    if (typeof result.population === 'number') return result;
  }

  return { population: null, source: attemptedKnownSource };
}
