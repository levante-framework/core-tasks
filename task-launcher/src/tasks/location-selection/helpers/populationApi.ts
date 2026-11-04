import type { RoarAppkit } from '@levante-framework/firekit';
import { taskStore } from '../../../taskStore';
import { getDefaultPopulationKonturH3ApiUrl, getDefaultPopulationWorldpopH3ApiUrl } from './cloudFunctions';

type PopulationSource = 'kontur' | 'worldpop';

type PopulationLookupResult = {
  population: number | null;
  source: PopulationSource | 'unknown';
};

const POPULATION_LOOKUP_TIMEOUT_MS = 25000;

let firekit: RoarAppkit | null = null;
export function initPopulationApi(config: Record<string, any>): void {
  firekit = config.firekit ?? null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (taskStore().demoMode || !firekit) return {};

  const user = firekit.firebaseProject?.auth?.currentUser;
  if (!user) return {};

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

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
    const headers = await getAuthHeaders();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), POPULATION_LOOKUP_TIMEOUT_MS);
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers,
    });
    window.clearTimeout(timeout);

    if (!response.ok) {
      return { population: null, source };
    }

    const payload = await response.json().catch(() => ({}));
    const resolvedSourceRaw = String(payload?.source || '')
      .trim()
      .toLowerCase();
    const resolvedSource: PopulationSource | 'unknown' =
      resolvedSourceRaw === 'kontur' || resolvedSourceRaw === 'worldpop' ? resolvedSourceRaw : source;
    const parsed = parsePopulation(payload);
    if (typeof parsed === 'number') {
      return { population: parsed, source: resolvedSource };
    }
    return { population: null, source: resolvedSource };
  } catch {
    return { population: null, source };
  }
}

export async function lookupPopulationForCell(cellId: string, resolution: number): Promise<PopulationLookupResult> {
  const konturUrl = getDefaultPopulationKonturH3ApiUrl();
  const worldpopUrl = getDefaultPopulationWorldpopH3ApiUrl();
  const orderedSources: PopulationSource[] = ['kontur', 'worldpop'];

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
