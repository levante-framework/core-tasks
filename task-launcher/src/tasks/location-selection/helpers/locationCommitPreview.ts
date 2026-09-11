import { cellToLatLng, latLngToCell } from 'h3-js';
import { type LocationSelectionDraft } from './state';
import { H3_MAX_RESOLUTION, H3_MIN_RESOLUTION, type LocationSelectionTaskConfig } from './config';
import { lookupPopulationBatch, lookupPopulationForCell } from './populationApi';
import { taskStore } from '../../../taskStore';
import { persistLocation } from './persistLocation';
import { LocationV1 } from '@levante-framework/firekit';

export type PopulationCandidateDebug = {
  resolution: number;
  cellId: string;
  population: number | null;
  source: 'kontur' | 'worldpop' | 'unknown';
  privacyMet: boolean;
};

export type LocationCommitComputation = {
  preview: LocationV1;
  candidates: PopulationCandidateDebug[];
};

function getPreferredPopulationSource(
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): 'kontur' | 'worldpop' {
  const preference = String(config?.populationSourcePreference || 'kontur').toLowerCase();
  if (preference === 'worldpop') return 'worldpop';
  return 'kontur';
}

function roundTo(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function buildLocationCommitPreview(
  draft: LocationSelectionDraft | null,
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): LocationV1 | null {
  if (!draft) return null;

  const baselineResolution = Number(config?.baselineResolution);
  const populationThreshold = Number(config?.populationThreshold);
  const safeBaselineResolution = Number.isInteger(baselineResolution) ? baselineResolution : 5;
  const safePopulationThreshold = Number.isFinite(populationThreshold) && populationThreshold > 0
    ? Math.round(populationThreshold)
    : 20000;
  const preferredSource = getPreferredPopulationSource(config);

  const baselineCell = latLngToCell(draft.lat, draft.lon, safeBaselineResolution);

  const effectiveCell = baselineCell;
  const [centerLat, centerLon] = cellToLatLng(effectiveCell);

  return {
    schemaVersion: 'location_v1',
    latLon: {
      lat: roundTo(centerLat, 6),
      lon: roundTo(centerLon, 6),
      source: 'h3_center',
    },
    scheme: 'h3_v1',
    h3CellId: effectiveCell,
    h3Cellresolution: safeBaselineResolution,
    populationThreshold: safePopulationThreshold,
    populationSource: preferredSource,
    computedAt: draft.selectedAt || new Date().toISOString(),
  };
}

export async function buildLocationCommitPreviewWithPopulation(
  draft: LocationSelectionDraft | null,
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): Promise<LocationV1 | null> {
  const computed = await buildLocationCommitComputationWithPopulation(draft, config);
  return computed?.preview || null;
}

export async function buildLocationCommitComputationWithPopulation(
  draft: LocationSelectionDraft | null,
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): Promise<LocationCommitComputation | null> {
  if (!draft) return null;

  const baselineResolution = Number(config?.baselineResolution);
  const minResolution = Number(config?.minResolution);
  const maxResolution = Number(config?.maxResolution);
  const populationThreshold = Number(config?.populationThreshold);
  const safeBaselineResolution = Number.isInteger(baselineResolution) ? baselineResolution : 5;
  const safeMinResolution = Math.max(
    H3_MIN_RESOLUTION,
    Math.min(
      safeBaselineResolution,
      Number.isInteger(minResolution) ? minResolution : H3_MIN_RESOLUTION,
    ),
  );
  const safeMaxResolution = Math.min(
    H3_MAX_RESOLUTION,
    Number.isInteger(maxResolution) && maxResolution >= safeBaselineResolution
      ? maxResolution
      : Math.max(H3_MAX_RESOLUTION, safeBaselineResolution),
  );
  const safePopulationThreshold = Number.isFinite(populationThreshold) && populationThreshold > 0
    ? Math.round(populationThreshold)
    : 20000;
  const preferredSource = getPreferredPopulationSource(config);

  const baselineCell = latLngToCell(draft.lat, draft.lon, safeBaselineResolution);
  let effectiveCell = baselineCell;
  let effectiveResolution = safeBaselineResolution;
  let effectivePopulationSource: 'kontur' | 'worldpop' | 'unknown' = 'unknown';
  let observedPopulationSource: 'kontur' | 'worldpop' | 'unknown' = 'unknown';
  const candidates: PopulationCandidateDebug[] = [];
  const useBatch = Boolean(config?.populationBatchEnabled);

  const cellIdByResolution = new Map<number, string>();
  for (let resolution = safeMinResolution; resolution <= safeMaxResolution; resolution += 1) {
    cellIdByResolution.set(resolution, latLngToCell(draft.lat, draft.lon, resolution));
  }
  const batchResults = useBatch
    ? await lookupPopulationBatch([...cellIdByResolution.values()], config)
    : null;

  const evaluateResolution = async (resolution: number) => {
    const cellId = cellIdByResolution.get(resolution);
    if (!cellId) return null;

    const populationResult =
      batchResults?.[cellId] ?? (await lookupPopulationForCell(cellId, resolution, config));
    const population = populationResult.population;
    if (populationResult.source !== 'unknown' && observedPopulationSource === 'unknown') {
      observedPopulationSource = populationResult.source;
    }
    const privacyMet = typeof population === 'number' ? population >= safePopulationThreshold : false;
    candidates.push({
      resolution,
      cellId,
      population,
      source: populationResult.source,
      privacyMet,
    });
    return { cellId, resolution, populationResult, privacyMet };
  };

  const baselineEvaluation = await evaluateResolution(safeBaselineResolution);
  if (baselineEvaluation?.privacyMet) {
    effectiveCell = baselineEvaluation.cellId;
    effectiveResolution = baselineEvaluation.resolution;
    effectivePopulationSource = baselineEvaluation.populationResult.source;

    for (let resolution = safeBaselineResolution + 1; resolution <= safeMaxResolution; resolution += 1) {
      const evaluation = await evaluateResolution(resolution);
      if (!evaluation) continue;
      if (evaluation.privacyMet) {
        effectiveCell = evaluation.cellId;
        effectiveResolution = evaluation.resolution;
        effectivePopulationSource = evaluation.populationResult.source;
        continue;
      }
      break;
    }
  } else {
    for (let resolution = safeBaselineResolution - 1; resolution >= safeMinResolution; resolution -= 1) {
      const evaluation = await evaluateResolution(resolution);
      if (!evaluation?.privacyMet) continue;
      effectiveCell = evaluation.cellId;
      effectiveResolution = evaluation.resolution;
      effectivePopulationSource = evaluation.populationResult.source;
      break;
    }
  }

  const [centerLat, centerLon] = cellToLatLng(effectiveCell);

  const preview: LocationV1= {
    schemaVersion: 'location_v1',
    latLon: {
      lat: roundTo(centerLat, 6),
      lon: roundTo(centerLon, 6),
      source: 'h3_center',
    },
    scheme: 'h3_v1',
    h3CellId: effectiveCell,
    h3Cellresolution: effectiveResolution,
    populationThreshold: safePopulationThreshold,
    populationSource:
      effectivePopulationSource !== 'unknown'
        ? effectivePopulationSource
        : (observedPopulationSource !== 'unknown' ? observedPopulationSource : preferredSource),
    computedAt: draft.selectedAt || new Date().toISOString(),
  };
  return {
    preview,
    candidates,
  };
}


export async function buildLocationSavePayload() {
  const draft = taskStore().locationSelectionDraft;
  const config = taskStore().locationSelectionConfig;
  const location = await buildLocationCommitPreviewWithPopulation(draft, config);

  if (location) {
    persistLocation(location);
  }
  taskStore("locationDataSaved", true);

  return location;
}
